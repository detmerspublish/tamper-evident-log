/**
 * audit-chain — Lightweight tamper-evident audit log with HMAC-SHA256 hash chain.
 * Zero dependencies. Framework-agnostic.
 *
 * @license MIT
 */

import { createHmac } from 'node:crypto';

const GENESIS_HASH = '0';

/**
 * Compute HMAC-SHA256 hash of a message.
 * @param {string} message - The message to hash
 * @param {string} secret - The HMAC secret key
 * @returns {string} Hex-encoded HMAC-SHA256 hash
 */
function computeHmac(message, secret) {
  return createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Build the canonical message string for hashing.
 * @param {string} type - Event type
 * @param {string} timestamp - ISO 8601 timestamp
 * @param {string} dataJson - JSON-serialized event data
 * @param {string} prevHash - Hash of the previous event
 * @returns {string} Canonical message
 */
function buildMessage(type, timestamp, dataJson, prevHash) {
  return `${type}|${timestamp}|${dataJson}|${prevHash}`;
}

/**
 * Simple async mutex. Ensures only one append() runs at a time.
 */
function createMutex() {
  let lock = Promise.resolve();
  return function acquire() {
    let release;
    const next = new Promise((resolve) => { release = resolve; });
    const pending = lock.then(() => release);
    lock = next;
    return pending;
  };
}

/**
 * Parse JSON data from an event, with a descriptive error on failure.
 * @param {object} event - The event with a data field
 * @returns {*} Parsed data
 */
function parseEventData(event) {
  if (typeof event.data !== 'string') return event.data;
  try {
    return JSON.parse(event.data);
  } catch (err) {
    throw new Error(`audit-chain: failed to parse data for event #${event.id} (${event.type}): ${err.message}`);
  }
}

/**
 * Create a tamper-proof audit log instance.
 *
 * @param {object} options
 * @param {object} options.store - Storage adapter implementing the AuditStore interface
 * @param {string} [options.secret='audit-chain-default-key'] - HMAC secret key. Use a strong,
 *   unique secret in production (e.g. `process.env.AUDIT_SECRET`). The default key is only
 *   suitable for testing.
 * @param {function} [options.hmac] - Custom HMAC function (message) => hash string. When
 *   provided, the `secret` parameter is ignored — the caller is responsible for binding
 *   the secret into the function.
 * @param {function} [options.now] - Custom timestamp function () => ISO 8601 string
 * @returns {object} Audit log instance with append, verify, getEvents, replay methods
 */
export function createAuditLog({ store, secret = 'audit-chain-default-key', hmac, now } = {}) {
  if (!store) {
    throw new Error('audit-chain: store is required. Use InMemoryStore for testing.');
  }

  const hashFn = hmac || ((message) => computeHmac(message, secret));
  const nowFn = now || (() => new Date().toISOString());
  const acquireLock = createMutex();

  /**
   * Append an event to the audit log.
   *
   * Thread-safe: concurrent calls are serialized via an internal mutex
   * to prevent race conditions on the hash chain.
   *
   * @param {string} type - Event type (e.g., 'user.created', 'invoice.updated')
   * @param {*} data - Event payload (will be JSON-serialized)
   * @param {string} [actor='system'] - Who performed the action
   * @returns {Promise<object>} The created event
   */
  async function append(type, data, actor = 'system') {
    if (!type || typeof type !== 'string') {
      throw new Error('audit-chain: type must be a non-empty string');
    }

    const release = await acquireLock();
    try {
      const prev = await store.getLastEvent();
      const prevHash = prev ? prev.hash : GENESIS_HASH;
      const timestamp = nowFn();
      const dataJson = JSON.stringify(data);
      const message = buildMessage(type, timestamp, dataJson, prevHash);
      const hash = hashFn(message);

      const event = {
        id: prev ? prev.id + 1 : 1,
        type,
        timestamp,
        actor,
        data: dataJson,
        hash,
        prev_hash: prevHash,
      };

      await store.appendEvent(event);
      return event;
    } finally {
      release();
    }
  }

  /**
   * Verify the integrity of the hash chain.
   *
   * When `limit` is specified, only the last N events are verified for internal
   * consistency (hash correctness + chain continuity). The genesis check is only
   * performed when verifying the full chain (no limit).
   *
   * @param {object} [options]
   * @param {number} [options.limit] - Verify only the last N events (default: all)
   * @returns {Promise<object>} { valid: boolean, checked: number, errors: Array }
   */
  async function verify({ limit } = {}) {
    const allEvents = await store.getAllEvents({ order: 'asc' });
    const events = limit ? allEvents.slice(-limit) : allEvents;
    const errors = [];

    for (let i = 0; i < events.length; i++) {
      const e = events[i];

      // Check chain linkage
      if (i === 0 && !limit) {
        // First event in the entire chain
        if (e.prev_hash !== GENESIS_HASH) {
          errors.push({ event_id: e.id, error: 'first event prev_hash is not genesis' });
        }
      } else if (i > 0) {
        if (e.prev_hash !== events[i - 1].hash) {
          errors.push({ event_id: e.id, error: 'prev_hash mismatch' });
        }
      }

      // Verify hash
      const message = buildMessage(e.type, e.timestamp, e.data, e.prev_hash);
      const expectedHash = hashFn(message);
      if (e.hash !== expectedHash) {
        errors.push({ event_id: e.id, error: 'hash mismatch' });
      }
    }

    return { valid: errors.length === 0, checked: events.length, errors };
  }

  /**
   * Get events from the log.
   *
   * Note: The type filter is applied after pagination. If you filter by type,
   * the result may contain fewer events than `limit`. For exact counts per type,
   * use `replay()` or implement type-aware pagination in your store adapter.
   *
   * @param {object} [options]
   * @param {number} [options.limit=50] - Max events to return (applied before type filter)
   * @param {number} [options.offset=0] - Offset for pagination (applied before type filter)
   * @param {string} [options.order='desc'] - Sort order ('asc' or 'desc')
   * @param {string} [options.type] - Filter by event type (applied after pagination)
   * @returns {Promise<Array>} Array of events with parsed data
   */
  async function getEvents({ limit = 50, offset = 0, order = 'desc', type } = {}) {
    const events = await store.getEvents({ limit: limit + offset, offset: 0, order });
    let result = events.slice(offset, offset + limit);
    if (type) {
      result = result.filter((e) => e.type === type);
    }
    return result.map((e) => ({ ...e, data: parseEventData(e) }));
  }

  /**
   * Replay events to reconstruct state.
   * @param {function} reducer - (state, event) => newState
   * @param {*} [initialState={}] - Initial state
   * @param {object} [options]
   * @param {string} [options.type] - Filter by event type
   * @returns {Promise<*>} Reconstructed state
   */
  async function replay(reducer, initialState = {}, { type } = {}) {
    let events = await store.getAllEvents({ order: 'asc' });
    if (type) {
      events = events.filter((e) => e.type === type);
    }
    return events.reduce((state, e) => {
      const parsed = { ...e, data: parseEventData(e) };
      return reducer(state, parsed);
    }, initialState);
  }

  return { append, verify, getEvents, replay };
}

export { InMemoryStore } from './store/memory.js';

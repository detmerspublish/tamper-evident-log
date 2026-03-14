/**
 * In-memory store for audit-chain.
 * Suitable for testing, prototyping, and short-lived processes.
 */
export class InMemoryStore {
  #events = [];

  async getLastEvent() {
    return this.#events.length > 0
      ? this.#events[this.#events.length - 1]
      : null;
  }

  async appendEvent(event) {
    this.#events.push({ ...event });
  }

  async getEvents({ limit = 50, offset = 0, order = 'desc' } = {}) {
    const sorted = order === 'asc'
      ? [...this.#events]
      : [...this.#events].reverse();
    return sorted.slice(offset, offset + limit);
  }

  async getAllEvents({ order = 'asc' } = {}) {
    return order === 'asc'
      ? [...this.#events]
      : [...this.#events].reverse();
  }

  async count() {
    return this.#events.length;
  }

  async clear() {
    this.#events = [];
  }

  /**
   * Direct access to internal events array for tamper-detection tests.
   * NOT part of the AuditStore interface. Do not use in production code.
   * @returns {AuditEvent[]} Mutable reference to internal events
   */
  _dangerouslyGetEvents() {
    return this.#events;
  }
}

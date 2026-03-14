import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAuditLog, InMemoryStore } from '../src/index.js';

describe('append', () => {
  let log, store;

  beforeEach(() => {
    store = new InMemoryStore();
    log = createAuditLog({ store, secret: 'test-secret' });
  });

  it('appends a single event', async () => {
    const event = await log.append('user.created', { id: 1, name: 'Alice' });
    assert.equal(event.id, 1);
    assert.equal(event.type, 'user.created');
    assert.equal(event.actor, 'system');
    assert.equal(event.prev_hash, '0');
    assert.equal(typeof event.hash, 'string');
    assert.equal(event.hash.length, 64);
  });

  it('chains events with prev_hash', async () => {
    const e1 = await log.append('user.created', { id: 1 });
    const e2 = await log.append('user.updated', { id: 1, name: 'Bob' });
    assert.equal(e2.prev_hash, e1.hash);
    assert.notEqual(e2.hash, e1.hash);
  });

  it('stores actor', async () => {
    const event = await log.append('user.created', { id: 1 }, 'admin');
    assert.equal(event.actor, 'admin');
  });

  it('increments id', async () => {
    await log.append('a', {});
    await log.append('b', {});
    const e3 = await log.append('c', {});
    assert.equal(e3.id, 3);
  });

  it('serializes data as JSON', async () => {
    const event = await log.append('test', { nested: { value: 42 } });
    assert.equal(typeof event.data, 'string');
    assert.deepEqual(JSON.parse(event.data), { nested: { value: 42 } });
  });

  it('throws on empty type', async () => {
    await assert.rejects(() => log.append('', {}), /type must be a non-empty string/);
  });

  it('throws on non-string type', async () => {
    await assert.rejects(() => log.append(123, {}), /type must be a non-empty string/);
  });

  it('throws without store', () => {
    assert.throws(() => createAuditLog({}), /store is required/);
  });

  it('uses custom timestamp function', async () => {
    const fixedLog = createAuditLog({
      store,
      secret: 'test-secret',
      now: () => '2026-01-01T00:00:00.000Z',
    });
    const event = await fixedLog.append('test', {});
    assert.equal(event.timestamp, '2026-01-01T00:00:00.000Z');
  });

  it('uses custom hmac function', async () => {
    const customLog = createAuditLog({
      store,
      hmac: () => 'custom-hash-value',
    });
    const event = await customLog.append('test', {});
    assert.equal(event.hash, 'custom-hash-value');
  });
});

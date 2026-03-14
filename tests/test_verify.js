import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAuditLog, InMemoryStore } from '../src/index.js';

describe('verify', () => {
  let log, store;

  beforeEach(() => {
    store = new InMemoryStore();
    log = createAuditLog({ store, secret: 'test-secret' });
  });

  it('verifies empty chain', async () => {
    const result = await log.verify();
    assert.equal(result.valid, true);
    assert.equal(result.checked, 0);
    assert.deepEqual(result.errors, []);
  });

  it('verifies single event', async () => {
    await log.append('test', { value: 1 });
    const result = await log.verify();
    assert.equal(result.valid, true);
    assert.equal(result.checked, 1);
  });

  it('verifies chain of 10 events', async () => {
    for (let i = 0; i < 10; i++) {
      await log.append('item.created', { index: i });
    }
    const result = await log.verify();
    assert.equal(result.valid, true);
    assert.equal(result.checked, 10);
  });

  it('detects hash tampering', async () => {
    await log.append('test', { value: 1 });
    await log.append('test', { value: 2 });

    // Tamper with the first event's hash
    store._dangerouslyGetEvents()[0].hash = 'tampered-hash';

    const result = await log.verify();
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 1);
    assert.ok(result.errors.some((e) => e.error === 'hash mismatch'));
  });

  it('detects data tampering', async () => {
    await log.append('test', { value: 1 });
    await log.append('test', { value: 2 });

    // Tamper with event data
    store._dangerouslyGetEvents()[0].data = JSON.stringify({ value: 999 });

    const result = await log.verify();
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.event_id === 1 && e.error === 'hash mismatch'));
  });

  it('detects prev_hash chain break', async () => {
    await log.append('a', {});
    await log.append('b', {});
    await log.append('c', {});

    // Break the chain linkage
    store._dangerouslyGetEvents()[1].prev_hash = 'wrong-hash';

    const result = await log.verify();
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.error === 'prev_hash mismatch'));
  });

  it('detects tampered genesis prev_hash', async () => {
    await log.append('test', {});

    store._dangerouslyGetEvents()[0].prev_hash = 'not-zero';

    const result = await log.verify();
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.error === 'first event prev_hash is not genesis'));
  });

  it('verifies with limit', async () => {
    for (let i = 0; i < 20; i++) {
      await log.append('item', { i });
    }
    const result = await log.verify({ limit: 5 });
    assert.equal(result.valid, true);
    assert.equal(result.checked, 5);
  });

  it('detects timestamp tampering', async () => {
    await log.append('test', { value: 1 });

    store._dangerouslyGetEvents()[0].timestamp = '1999-01-01T00:00:00.000Z';

    const result = await log.verify();
    assert.equal(result.valid, false);
  });

  it('detects type tampering', async () => {
    await log.append('user.created', { id: 1 });

    store._dangerouslyGetEvents()[0].type = 'user.deleted';

    const result = await log.verify();
    assert.equal(result.valid, false);
  });
});

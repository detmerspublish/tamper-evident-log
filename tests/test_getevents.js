import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAuditLog, InMemoryStore } from '../src/index.js';

describe('getEvents', () => {
  let log, store;

  beforeEach(async () => {
    store = new InMemoryStore();
    log = createAuditLog({ store, secret: 'test-secret' });
    await log.append('user.created', { id: 1, name: 'Alice' });
    await log.append('invoice.created', { id: 100, amount: 39 });
    await log.append('user.updated', { id: 1, name: 'Alicia' });
  });

  it('returns events in desc order by default', async () => {
    const events = await log.getEvents();
    assert.equal(events[0].type, 'user.updated');
    assert.equal(events[2].type, 'user.created');
  });

  it('parses data from JSON', async () => {
    const events = await log.getEvents();
    assert.equal(typeof events[0].data, 'object');
    assert.equal(events[0].data.name, 'Alicia');
  });

  it('filters by type', async () => {
    const events = await log.getEvents({ type: 'user.created' });
    assert.equal(events.length, 1);
    assert.equal(events[0].data.name, 'Alice');
  });

  it('respects limit', async () => {
    const events = await log.getEvents({ limit: 2 });
    assert.equal(events.length, 2);
  });

  it('respects offset', async () => {
    const events = await log.getEvents({ limit: 1, offset: 1 });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'invoice.created');
  });
});

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryStore } from '../src/store/memory.js';

describe('InMemoryStore', () => {
  let store;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  it('returns null for empty store', async () => {
    const last = await store.getLastEvent();
    assert.equal(last, null);
  });

  it('appends and retrieves events', async () => {
    await store.appendEvent({ id: 1, type: 'a', hash: 'h1' });
    await store.appendEvent({ id: 2, type: 'b', hash: 'h2' });

    const last = await store.getLastEvent();
    assert.equal(last.id, 2);
  });

  it('returns events in desc order by default', async () => {
    await store.appendEvent({ id: 1 });
    await store.appendEvent({ id: 2 });
    await store.appendEvent({ id: 3 });

    const events = await store.getEvents({ limit: 10 });
    assert.deepEqual(events.map((e) => e.id), [3, 2, 1]);
  });

  it('returns events in asc order', async () => {
    await store.appendEvent({ id: 1 });
    await store.appendEvent({ id: 2 });

    const events = await store.getEvents({ limit: 10, order: 'asc' });
    assert.deepEqual(events.map((e) => e.id), [1, 2]);
  });

  it('respects limit and offset', async () => {
    for (let i = 1; i <= 5; i++) {
      await store.appendEvent({ id: i });
    }

    const events = await store.getEvents({ limit: 2, offset: 1, order: 'asc' });
    assert.deepEqual(events.map((e) => e.id), [2, 3]);
  });

  it('getAllEvents returns all in asc', async () => {
    await store.appendEvent({ id: 1 });
    await store.appendEvent({ id: 2 });

    const all = await store.getAllEvents();
    assert.equal(all.length, 2);
    assert.equal(all[0].id, 1);
  });

  it('count returns correct number', async () => {
    assert.equal(await store.count(), 0);
    await store.appendEvent({ id: 1 });
    await store.appendEvent({ id: 2 });
    assert.equal(await store.count(), 2);
  });

  it('clear empties the store', async () => {
    await store.appendEvent({ id: 1 });
    await store.clear();
    assert.equal(await store.count(), 0);
    assert.equal(await store.getLastEvent(), null);
  });

  it('does not mutate stored events', async () => {
    const event = { id: 1, type: 'test', data: 'original' };
    await store.appendEvent(event);
    event.data = 'mutated';

    const last = await store.getLastEvent();
    assert.equal(last.data, 'original');
  });
});

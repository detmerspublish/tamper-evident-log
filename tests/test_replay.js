import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAuditLog, InMemoryStore } from '../src/index.js';

describe('replay', () => {
  let log, store;

  beforeEach(() => {
    store = new InMemoryStore();
    log = createAuditLog({ store, secret: 'test-secret' });
  });

  it('replays empty log', async () => {
    const state = await log.replay((s) => s, {});
    assert.deepEqual(state, {});
  });

  it('reconstructs state from events', async () => {
    await log.append('user.created', { id: 1, name: 'Alice' });
    await log.append('user.created', { id: 2, name: 'Bob' });
    await log.append('user.updated', { id: 1, name: 'Alicia' });

    const state = await log.replay((users, event) => {
      if (event.type === 'user.created') {
        return { ...users, [event.data.id]: event.data };
      }
      if (event.type === 'user.updated') {
        return { ...users, [event.data.id]: { ...users[event.data.id], ...event.data } };
      }
      return users;
    }, {});

    assert.deepEqual(state, {
      1: { id: 1, name: 'Alicia' },
      2: { id: 2, name: 'Bob' },
    });
  });

  it('filters by type', async () => {
    await log.append('user.created', { id: 1 });
    await log.append('invoice.created', { id: 100 });
    await log.append('user.created', { id: 2 });

    const count = await log.replay(
      (n, _event) => n + 1,
      0,
      { type: 'user.created' },
    );
    assert.equal(count, 2);
  });

  it('preserves event order', async () => {
    await log.append('step', { n: 1 });
    await log.append('step', { n: 2 });
    await log.append('step', { n: 3 });

    const order = await log.replay((arr, event) => [...arr, event.data.n], []);
    assert.deepEqual(order, [1, 2, 3]);
  });
});

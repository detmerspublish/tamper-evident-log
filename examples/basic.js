import { createAuditLog, InMemoryStore } from 'audit-chain';

const store = new InMemoryStore();
const log = createAuditLog({ store, secret: process.env.AUDIT_SECRET || 'demo-secret' });

// Append events
const e1 = await log.append('user.created', { id: 1, name: 'Alice' });
console.log('Created:', e1.type, '→ hash:', e1.hash.slice(0, 12) + '...');

const e2 = await log.append('user.updated', { id: 1, name: 'Bob' }, 'admin');
console.log('Updated:', e2.type, '→ prev_hash:', e2.prev_hash.slice(0, 12) + '...');

// Verify chain integrity
const result = await log.verify();
console.log('Verify:', result);

// Get events (paginated, desc by default)
const events = await log.getEvents({ limit: 10 });
console.log('Events:', events.map((e) => `${e.type} (${e.data.name})`));

// Replay to reconstruct state
const users = await log.replay((state, event) => {
  if (event.type === 'user.created') state[event.data.id] = event.data;
  if (event.type === 'user.updated') Object.assign(state[event.data.id], event.data);
  return state;
}, {});
console.log('State:', users);

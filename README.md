# audit-chain

**Lightweight tamper-evident audit log for Node.js**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#)

A framework-agnostic, zero-dependency audit log with HMAC-SHA256 hash chain integrity.
Each event is cryptographically linked to the previous one — any modification breaks the chain
and is immediately detectable.

Built for developers who need compliance-ready audit trails (SOC 2, NIS2, ISO 27001, GDPR, GoBD)
without cloud dependencies or heavy infrastructure.

## Features

- **HMAC-SHA256 hash chain** — each event is cryptographically linked to its predecessor
- **Tamper detection** — any modification to any event breaks the chain
- **Event replay** — reconstruct state from the event log
- **Zero dependencies** — only uses `node:crypto`
- **Framework-agnostic** — works with any database, any framework
- **Storage adapter interface** — bring your own storage (InMemory adapter included)
- **TypeScript declarations** — full type support

## Quick Start

```js
import { createAuditLog, InMemoryStore } from 'audit-chain';

const store = new InMemoryStore();
const log = createAuditLog({ store, secret: process.env.AUDIT_SECRET });

// Append events
await log.append('user.created', { id: 1, name: 'Alice' });
await log.append('user.updated', { id: 1, name: 'Bob' }, 'admin');

// Verify chain integrity
const result = await log.verify();
console.log(result);
// { valid: true, checked: 2, errors: [] }

// Replay to reconstruct state
const users = await log.replay((state, event) => {
  if (event.type === 'user.created') state[event.data.id] = event.data;
  if (event.type === 'user.updated') Object.assign(state[event.data.id], event.data);
  return state;
}, {});
```

## Installation

```bash
npm install audit-chain
```

## API

### `createAuditLog(options)`

Creates an audit log instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `store` | `AuditStore` | *required* | Storage adapter |
| `secret` | `string` | `'audit-chain-default-key'` | HMAC secret key |
| `hmac` | `function` | built-in HMAC-SHA256 | Custom hash function `(message) => hashString` |
| `now` | `function` | `Date.toISOString()` | Custom timestamp function `() => isoString` |

Returns: `{ append, verify, getEvents, replay }`

### `log.append(type, data, actor?)`

Appends an event to the chain.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `string` | *required* | Event type (e.g. `'user.created'`) |
| `data` | `any` | *required* | Event payload (JSON-serializable) |
| `actor` | `string` | `'system'` | Who performed the action |

Returns: `Promise<AuditEvent>`

### `log.verify(options?)`

Verifies the integrity of the hash chain.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | all | Only verify the last N events |

Returns: `Promise<{ valid: boolean, checked: number, errors: Array }>`

### `log.getEvents(options?)`

Retrieves events with pagination and filtering.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `50` | Max events to return |
| `offset` | `number` | `0` | Pagination offset |
| `order` | `'asc' \| 'desc'` | `'desc'` | Sort order |
| `type` | `string` | all | Filter by event type |

Returns: `Promise<Array<AuditEvent>>` (with parsed `data`)

### `log.replay(reducer, initialState?, options?)`

Replays events to reconstruct state.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `reducer` | `function` | *required* | `(state, event) => newState` |
| `initialState` | `any` | `{}` | Initial state |
| `options.type` | `string` | all | Filter by event type |

Returns: `Promise<any>`

## Storage Adapters

### InMemoryStore (included)

```js
import { InMemoryStore } from 'audit-chain';
const store = new InMemoryStore();
```

Suitable for testing and prototyping. Data is lost when the process exits.

### Custom Adapter

Implement the `AuditStore` interface:

```js
class MyStore {
  async getLastEvent() { /* return last event or null */ }
  async appendEvent(event) { /* persist event */ }
  async getEvents({ limit, offset, order }) { /* return events */ }
  async getAllEvents({ order }) { /* return all events */ }
}
```

## How It Works

Each event contains a hash computed from:

```
hash = HMAC-SHA256(type | timestamp | JSON(data) | prev_hash, secret)
```

The first event uses `'0'` as `prev_hash`. Each subsequent event uses the hash of
the previous event. This creates a chain where modifying any event invalidates
all subsequent hashes.

```
Event 1: hash₁ = HMAC(type|ts|data|'0')
Event 2: hash₂ = HMAC(type|ts|data|hash₁)
Event 3: hash₃ = HMAC(type|ts|data|hash₂)

Tamper Event 1 → hash₁ changes → hash₂ verification fails
```

## Use Cases

- **Financial records** — GoBD-compliant audit trail for invoices and transactions
- **User activity logs** — prove that logs haven't been altered
- **Compliance audits** — SOC 2, NIS2, ISO 27001 require tamper-evident logging
- **Data integrity** — detect unauthorized modifications to sensitive data
- **Event sourcing** — replay events to reconstruct application state

## Used In Production

This library powers the audit trail in [Code-Fabrik](https://github.com/detmerspublish) desktop tools,
protecting financial records and membership data for German businesses and nonprofits.

## License

[MIT](LICENSE)

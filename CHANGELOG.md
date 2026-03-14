# Changelog

## 0.1.0 (2026-03-14)

Initial release.

- HMAC-SHA256 hash chain with tamper detection
- `append()` with async mutex for thread safety
- `verify()` with full chain or last-N verification
- `getEvents()` with pagination, ordering, and type filter
- `replay()` for event-sourced state reconstruction
- `InMemoryStore` adapter included
- TypeScript declarations
- Zero dependencies (only `node:crypto`)

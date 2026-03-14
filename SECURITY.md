# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in audit-chain, please report it responsibly:

**Email:** security@detmers-publish.de

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We will acknowledge your report within 48 hours and aim to provide a fix within 7 days for critical issues.

**Please do not open a public GitHub issue for security vulnerabilities.**

## Scope

audit-chain is a cryptographic integrity library. Security-relevant areas include:
- HMAC-SHA256 hash computation and chain verification
- Event data serialization and parsing
- Storage adapter interface contracts

## Design Decisions

- **No timing-safe comparison in `verify()`**: The hash comparison uses standard `!==` because `verify()` is not an authentication gate. It checks data integrity offline, not in a request path where timing attacks apply.
- **Default secret key**: The default key `'audit-chain-default-key'` is for testing only. Production usage must provide a strong, unique secret.

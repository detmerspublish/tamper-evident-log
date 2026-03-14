/**
 * Example: Express middleware for audit logging.
 *
 * Usage:
 *   import { auditMiddleware, auditLog } from './express-middleware.js';
 *   app.use(auditMiddleware);
 *   app.get('/audit', async (req, res) => {
 *     const events = await auditLog.getEvents({ limit: 20 });
 *     res.json(events);
 *   });
 */
import { createAuditLog, InMemoryStore } from 'audit-chain';

// Replace InMemoryStore with your database adapter in production
const store = new InMemoryStore();
export const auditLog = createAuditLog({ store, secret: process.env.AUDIT_SECRET });

/**
 * Audit middleware for Express.
 *
 * IMPORTANT: This logs every response. In high-traffic apps, consider filtering
 * to only API routes (e.g. `if (!req.path.startsWith('/api/')) return next();`)
 * to avoid bloating the audit trail with static file or health check requests.
 */
export function auditMiddleware(req, res, next) {
  const originalEnd = res.end;

  res.end = function (...args) {
    // Skip non-API routes and health checks
    if (!req.path.startsWith('/api/') || res.statusCode === 404) {
      originalEnd.apply(this, args);
      return;
    }

    const actor = req.headers['x-user-id'] || 'anonymous';
    const type = `http.${req.method.toLowerCase()}`;
    const data = {
      path: req.path,
      status: res.statusCode,
      ip: req.ip,
    };

    auditLog.append(type, data, actor).catch((err) => {
      // In production, forward to error tracking (e.g. Sentry)
      console.error('Audit log error:', err);
    });

    originalEnd.apply(this, args);
  };

  next();
}

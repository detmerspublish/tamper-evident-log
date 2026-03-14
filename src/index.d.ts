import { AuditStore, AuditEvent } from './store/memory.js';

export { InMemoryStore, AuditStore, AuditEvent } from './store/memory.js';

export interface ParsedAuditEvent extends Omit<AuditEvent, 'data'> {
  data: unknown;
}

export interface CreateAuditLogOptions {
  store: AuditStore;
  secret?: string;
  /**
   * Custom HMAC function. When provided, `secret` is ignored.
   * The caller is responsible for binding the secret into this function.
   */
  hmac?: (message: string) => string;
  now?: () => string;
}

export interface VerifyOptions {
  limit?: number;
}

export interface VerifyError {
  event_id: number;
  error: string;
}

export interface VerifyResult {
  valid: boolean;
  checked: number;
  errors: VerifyError[];
}

export interface GetEventsOptions {
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  type?: string;
}

export interface ReplayOptions {
  type?: string;
}

export interface AuditLog {
  append(type: string, data: unknown, actor?: string): Promise<AuditEvent>;
  verify(options?: VerifyOptions): Promise<VerifyResult>;
  getEvents(options?: GetEventsOptions): Promise<ParsedAuditEvent[]>;
  replay<T>(reducer: (state: T, event: ParsedAuditEvent) => T, initialState?: T, options?: ReplayOptions): Promise<T>;
}

export declare function createAuditLog(options: CreateAuditLogOptions): AuditLog;

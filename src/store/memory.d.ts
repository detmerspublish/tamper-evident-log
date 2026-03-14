export interface AuditEvent {
  id: number;
  type: string;
  timestamp: string;
  actor: string;
  data: string;
  hash: string;
  prev_hash: string;
}

export interface GetEventsOptions {
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
}

export interface GetAllEventsOptions {
  order?: 'asc' | 'desc';
}

export interface AuditStore {
  getLastEvent(): Promise<AuditEvent | null>;
  appendEvent(event: AuditEvent): Promise<void>;
  getEvents(options?: GetEventsOptions): Promise<AuditEvent[]>;
  getAllEvents(options?: GetAllEventsOptions): Promise<AuditEvent[]>;
}

export declare class InMemoryStore implements AuditStore {
  getLastEvent(): Promise<AuditEvent | null>;
  appendEvent(event: AuditEvent): Promise<void>;
  getEvents(options?: GetEventsOptions): Promise<AuditEvent[]>;
  getAllEvents(options?: GetAllEventsOptions): Promise<AuditEvent[]>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

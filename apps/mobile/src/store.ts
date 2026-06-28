// Reuse the main app's Zustand store + actions (single source of truth, talks to
// the same Express/SQLite backend via the durable outbox).
export * from '../../../src/store';

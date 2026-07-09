import { neon } from '@neondatabase/serverless';

// Narrowed call signature: with default options the neon client always
// resolves tagged-template queries to an array of row objects.
type Sql = ((strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>) & {
  query: (text: string, params?: any[]) => Promise<any>;
};

// Single Neon HTTP client per (cold) start. DATABASE_URL comes from
// Vercel env vars (Neon integration) or .env for local dev.
let _sql: Sql | null = null;

export function sql(): Sql {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    _sql = neon(url) as unknown as Sql;
  }
  return _sql;
}

// All ids are TEXT (crypto.randomUUID) so legacy string ids keep working.
// Flexible page-content shapes (events, artists, organizers) live in JSONB
// so the frontend types can evolve without schema migrations.
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    profile_image TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS organizers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    data JSONB NOT NULL DEFAULT '{}'
  )`,
  `CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '',
    stage_name TEXT NOT NULL DEFAULT '',
    data JSONB NOT NULL DEFAULT '{}'
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'draft',
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    booking_number TEXT NOT NULL,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ticket_type TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    booking_status TEXT NOT NULL DEFAULT 'active',
    qr_code TEXT NOT NULL DEFAULT '',
    event_title TEXT NOT NULL DEFAULT '',
    event_image TEXT NOT NULL DEFAULT '',
    event_date TEXT NOT NULL DEFAULT '',
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    ticket_number TEXT NOT NULL,
    booking_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    qr_code TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active'
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'GBP',
    provider TEXT NOT NULL DEFAULT 'stripe',
    transaction_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, target_type, target_id)
  )`,
  `CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
  )`,
  // Social login metadata (ALTER keeps already-provisioned databases in sync)
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'password'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id TEXT NOT NULL DEFAULT ''`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_follows_target ON follows (target_type, target_id)`,
];

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const s = sql();
      for (const stmt of SCHEMA_STATEMENTS) {
        await s.query(stmt);
      }
    })().catch((err) => {
      schemaReady = null; // allow retry on next request
      throw err;
    });
  }
  return schemaReady;
}

export function newId(): string {
  return crypto.randomUUID();
}

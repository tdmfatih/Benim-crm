import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

export interface DatabaseAdapter {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  transaction<T>(callback: (client: pg.PoolClient | DatabaseAdapter) => Promise<T>): Promise<T>;
  isPostgres(): boolean;
}

let pool: pg.Pool | null = null;
let isPgConnected = false;

// Local JSON / in-memory store for fallback when PostgreSQL is not yet configured
const DATA_DIR = path.join(process.cwd(), 'data_store');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create data_store dir, using in-memory only', err);
  }
}

function getLocalStore<T>(collection: string, defaultData: T): T {
  try {
    const filePath = path.join(DATA_DIR, `${collection}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Local store read error (${collection}):`, e);
  }
  return defaultData;
}

function saveLocalStore<T>(collection: string, data: T): void {
  try {
    const filePath = path.join(DATA_DIR, `${collection}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Local store write error (${collection}):`, e);
  }
}

export const fallbackStorage = {
  get: getLocalStore,
  save: saveLocalStore,
};

export function initDatabase(): void {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    try {
      pool = new Pool({
        connectionString,
        ssl: process.env.DATABASE_SSL === 'true' || connectionString.includes('sslmode=require') 
          ? { rejectUnauthorized: false } 
          : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      pool.on('error', (err) => {
        console.error('Unexpected error on idle PostgreSQL client:', err);
      });

      // Test connection
      pool.query('SELECT NOW()', (err, res) => {
        if (err) {
          console.warn('⚠️ PostgreSQL connection failed, operating with resilient persistent local adapter:', err.message);
          isPgConnected = false;
        } else {
          console.log('✅ Connected to PostgreSQL database successfully at:', res.rows[0].now);
          isPgConnected = true;
          runMigrationsInternal();
        }
      });
    } catch (err) {
      console.warn('⚠️ Failed to initialize PostgreSQL pool, falling back to local adapter:', err);
      isPgConnected = false;
    }
  } else {
    console.log('ℹ️ DATABASE_URL not provided. Using resilient local persistent file storage. Set DATABASE_URL for PostgreSQL.');
  }
}

async function runMigrationsInternal() {
  if (!pool || !isPgConnected) return;
  try {
    const schemaPath = path.join(process.cwd(), 'server', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(sql);
      console.log('✅ Database schema verified & migrations checked.');
    }
  } catch (err) {
    console.error('❌ Migration execution error:', err);
  }
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  if (pool && isPgConnected) {
    try {
      const res = await pool.query(text, params);
      return { rows: res.rows, rowCount: res.rowCount || 0 };
    } catch (err: any) {
      console.error('PostgreSQL query error:', err.message, 'SQL:', text);
      throw err;
    }
  }

  // Fallback for demo/dev mode without postgres
  return { rows: [], rowCount: 0 };
}

export async function transaction<T>(callback: (client: pg.PoolClient | any) => Promise<T>): Promise<T> {
  if (pool && isPgConnected) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return await callback(null);
}

export function isDatabaseConnected(): boolean {
  return isPgConnected;
}

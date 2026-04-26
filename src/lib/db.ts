import pg from 'pg';
export const client = new pg.Client({
  connectionString: import.meta.env.DATABASE_URL,
});
await client.connect();

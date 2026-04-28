import pg from 'pg';

export async function initDb(): Promise<any> {
  
  try {

    const client = new pg.Client({
      connectionString: import.meta.env.DATABASE_URL,
    });
    await client.connect();

    return client;

  } catch (e) {
    console.error("Global error caught:", e);
    throw e; 
  }

}
//export { client as db };
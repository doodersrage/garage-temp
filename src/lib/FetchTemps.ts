import { initDb } from '../lib/db';

export async function fetchTemps(): Promise<any> {
  const url = `https://garage.robmcd.name/`;
  try {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Weather data not found');
    }

    const data = await response.json();

    const db = await initDb();
    const qry = 'INSERT INTO garage_temps (tempc, tempf, humidity, timestamp) VALUES($1, $2, $3, $4)';
    const values = [data.temp["avg"].c, data.temp["avg"].f, data.temp["avg"].h, new Date()];
    await db.query(qry, values);

    return data;

  } catch (e) {
    console.error("Global error caught:", e);
    throw e; 
  }
  
}
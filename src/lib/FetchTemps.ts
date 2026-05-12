import { initDb } from '../lib/db';

export async function fetchTemps(): Promise<any> {
  const url = `https://garage.robmcd.name/`;
  try {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Weather data not found');
    }

    const data = await response.json();

    // check for null values in feed
    if (data.temp["0"].f === null) {
      data.temp["0"].f = 0;
    }
    if (data.temp["0"].c === null) {
      data.temp["0"].c = 0;
    }
    if (data.temp["0"].h === null) {
      data.temp["0"].h = 0;
    }
    if (data.temp["1"].f === null) {
      data.temp["1"].f = 0;
    }
    if (data.temp["1"].c === null) {
      data.temp["1"].c = 0;
    }
    if (data.temp["1"].h === null) {
      data.temp["1"].h = 0;
    }
    if (data.temp["avg"].f === null) {
      data.temp["avg"].f = (data.temp["0"].f ? data.temp["0"].f : (data.temp["1"].f ? data.temp["1"].f : 0));
    }
    if (data.temp["avg"].c === null) {
      data.temp["avg"].c = (data.temp["0"].c ? data.temp["0"].c : (data.temp["1"].c ? data.temp["1"].c : 0));
    }
    if (data.temp["avg"].h === null) {
      data.temp["avg"].h = (data.temp["0"].h ? data.temp["0"].h : (data.temp["1"].h ? data.temp["1"].h : 0));
    }

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
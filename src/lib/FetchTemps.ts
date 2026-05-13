// fetch garage temperature data from external API and store in database
import { createServerClient } from "../lib/supabase";

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

    const supabase = createServerClient();
    const { error } = await supabase
    .from('garage_temps')
    .insert([{ tempc: data.temp["avg"].c, tempf: data.temp["avg"].f, humidity: data.temp["avg"].h, timestamp: new Date() }]);

    return data;

  } catch (e) {
    console.error("Global error caught:", e);
    throw e; 
  }
  
}
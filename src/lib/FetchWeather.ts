export async function fetchWeather(): Promise<any> {
  const apiKey = import.meta.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  const city = import.meta.env.NEXT_PUBLIC_OPENWEATHER_CITY_ID;
  const url = `https://api.openweathermap.org/data/2.5/weather?id=${city}&appid=${apiKey}&units=imperial`;
  try {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Temp data not found');
    }

    const data = await response.json();
    return data;

  } catch (e) {
    console.error("Global error caught:", e);
    throw e; 
  }
  
}
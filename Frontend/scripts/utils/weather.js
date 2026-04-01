const WEATHER_CACHE_KEY = "yatraai.weatherCache";
const WEATHER_CACHE_TTL = 15 * 60 * 1000;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCache(cache) {
  localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
}

export async function fetchWeather(lat, lng) {
  const key = `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`;
  const cache = readCache();
  const cached = cache[key];
  if (cached && Date.now() - cached.savedAt < WEATHER_CACHE_TTL) return cached.payload;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,is_day,weather_code&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather unavailable");
  const data = await response.json();
  const rainChance = data.daily?.precipitation_probability_max?.[0] ?? 0;
  const temp = data.current?.temperature_2m ?? data.daily?.temperature_2m_max?.[0] ?? 0;
  const verdict = rainChance > 60 ? "Weather may be wet, keep an indoor backup plan." : temp > 34 ? "Hot conditions, plan early starts and evening outings." : "Good time to visit for outdoor exploration.";
  const payload = {
    temperature: Math.round(temp),
    rainChance,
    verdict,
    max: Math.round(data.daily?.temperature_2m_max?.[0] ?? temp),
    min: Math.round(data.daily?.temperature_2m_min?.[0] ?? temp),
  };
  cache[key] = { savedAt: Date.now(), payload };
  writeCache(cache);
  return payload;
}

/**
 * KISSAN CONNECT - REAL-TIME WEATHER SERVICE
 * Interfaces with Open-Meteo (WMO Standard) for authentic real-time weather
 * Strictly NO fake temperatures or fake humidity.
 */

const https = require('https');

// WMO Weather interpretation codes (WW)
const WMO_CODES = {
  0: { te: 'నిర్మలమైన ఆకాశం', en: 'Clear sky' },
  1: { te: 'ప్రధానంగా నిర్మలం', en: 'Mainly clear' },
  2: { te: 'పాక్షికంగా మేఘావృతం', en: 'Partly cloudy' },
  3: { te: 'మబ్బులు పట్టి ఉంది', en: 'Overcast' },
  45: { te: 'పొగమంచు', en: 'Foggy' },
  51: { te: 'తేలికపాటి చినుకులు', en: 'Light drizzle' },
  61: { te: 'తేలికపాటి వర్షం', en: 'Slight rain' },
  63: { te: 'మోస్తరు వర్షం', en: 'Moderate rain' },
  65: { te: 'భారీ వర్షం', en: 'Heavy rain' },
  80: { te: 'వర్షపు జల్లులు', en: 'Rain showers' },
  95: { te: 'ఉరుములతో కూడిన వర్షం', en: 'Thunderstorm' }
};

/**
 * Fetch real weather for coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
async function fetchWeather(lat = 17.9689, lon = 79.5941) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FKolkata`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            resolve({
              status: 'unavailable',
              message: `Weather service returned HTTP ${res.statusCode}`,
              source: 'Open-Meteo / WMO Standard',
              lastUpdated: new Date().toISOString()
            });
            return;
          }

          const data = JSON.parse(rawData);
          const current = data.current || {};
          const daily = data.daily || {};

          const weatherCode = current.weather_code || 0;
          const condition = WMO_CODES[weatherCode] || { te: 'సాధారణ వాతావరణం', en: 'Normal' };

          resolve({
            status: 'live',
            source: 'Open-Meteo / WMO Standard',
            lastUpdated: current.time || new Date().toISOString(),
            location: {
              lat: Number(lat).toFixed(4),
              lon: Number(lon).toFixed(4),
              timezone: data.timezone || 'Asia/Kolkata'
            },
            current: {
              temperature: current.temperature_2m,
              apparentTemperature: current.apparent_temperature,
              humidity: current.relative_humidity_2m,
              windSpeedKmH: current.wind_speed_10m,
              precipitationMm: current.precipitation,
              weatherCode: weatherCode,
              conditionTe: condition.te,
              conditionEn: condition.en
            },
            dailyForecast: {
              maxTemp: (daily.temperature_2m_max && daily.temperature_2m_max[0]) || null,
              minTemp: (daily.temperature_2m_min && daily.temperature_2m_min[0]) || null,
              rainProbability: (daily.precipitation_probability_max && daily.precipitation_probability_max[0]) || 0
            }
          });
        } catch (err) {
          resolve({
            status: 'unavailable',
            message: 'Error parsing weather data',
            source: 'Open-Meteo / WMO Standard',
            lastUpdated: new Date().toISOString()
          });
        }
      });
    }).on('error', (err) => {
      resolve({
        status: 'unavailable',
        message: `Network error reaching weather service: ${err.message}`,
        source: 'Open-Meteo / WMO Standard',
        lastUpdated: new Date().toISOString()
      });
    });
  });
}

module.exports = { fetchWeather };

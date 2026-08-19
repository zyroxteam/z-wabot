const name = ['weather', 'mausam', 'wttr'];
const fetch = require('node-fetch');
async function run({ reply, body }) {
  const city = body.trim() || 'Delhi';
  try {
    const r = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { timeout: 15000 });
    const j = await r.json();
    const cur = j.current_condition?.[0];
    const loc = j.nearest_area?.[0];
    if (!cur) return reply('⚠ Weather data nahi mila.');
    const name = [loc?.areaName?.[0]?.value, loc?.region?.[0]?.value, loc?.country?.[0]?.value].filter(Boolean).join(', ');
    reply(`
🌤 *Weather — ${name}*
🌡 Temp: ${cur.temp_C}°C (feels ${cur.FeelsLikeC}°C)
💧 Humidity: ${cur.humidity}%
💨 Wind: ${cur.windspeedKmph} km/h (${cur.winddir16Point})
☁ Weather: ${cur.weatherDesc?.[0]?.value}
🌧 Rain: ${cur.precipMM} mm
☀ UV Index: ${cur.uvIndex}
👁 Visibility: ${cur.visibility} km
`.trim());
  } catch (e) { reply('⚠ Weather fail: ' + e.message); }
}
module.exports = { name, run };

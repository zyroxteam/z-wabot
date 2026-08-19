const name = ['qr', 'qrcode'];
async function run({ reply, body, sendImage }) {
  const text = body.trim();
  if (!text) return reply('📱 Usage: /qr https://example.com');
  try {
    const url = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(text);
    const r = await require('node-fetch')(url);
    const buf = await r.buffer();
    await sendImage(buf, '📱 QR for: ' + text.slice(0, 100));
  } catch (e) { reply('⚠ QR bana nahi paya: ' + e.message); }
}
module.exports = { name, run };

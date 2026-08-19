// /ping, /alive
const name = ['ping', 'alive', 'p'];
async function run({ reply, sock }) {
  const start = Date.now();
  const sent = await reply('🏓 Pong!');
  const latency = Date.now() - start;
  const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  return reply(`🏓 *Pong!*\n⚡ Latency: ${latency}ms\n💾 RAM: ${mem} MB\n🤖 ZYROX WA BOT v1.0 is alive! 💚`);
}
module.exports = { name, run };

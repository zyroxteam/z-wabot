const name = ['calc', 'calculate', 'math'];
async function run({ reply, body }) {
  const expr = body.trim();
  if (!expr) return reply('🧮 Usage: /calc 2+2*3');
  // Safe: only digits, basic ops, parens, dots, spaces
  if (!/^[0-9+\-*/().%\s]+$/.test(expr)) return reply('⚠ Invalid expression (only numbers + - * / % () . allowed)');
  try {
    // eslint-disable-next-line no-eval
    const res = Function('"use strict";return (' + expr + ')')();
    reply(`🧮 ${expr} = *${res}*`);
  } catch (e) { reply('⚠ Calculation error: ' + e.message); }
}
module.exports = { name, run };

import { GraphicsContext } from 'pixi.js';
const ctx = new GraphicsContext();
ctx.destroy();
console.log(ctx._activePath);
try {
  ctx.clear();
  console.log('clear worked');
} catch(e) {
  console.log('clear failed', e.message);
}

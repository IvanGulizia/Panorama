import { GraphicsContext } from 'pixi.js';
const ctx = new GraphicsContext();
try {
  ctx.beginPath();
  console.log('beginPath worked');
} catch(e) {
  console.log('beginPath failed:', e.message);
}

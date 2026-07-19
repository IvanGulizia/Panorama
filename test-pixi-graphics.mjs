import { Graphics, GraphicsContext } from 'pixi.js';
const ctx = new GraphicsContext();
try {
  const g = new Graphics(ctx);
  console.log('worked');
} catch(e) {
  console.error(e);
}

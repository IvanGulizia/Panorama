import { Graphics } from 'pixi.js';
const g = new Graphics();
try {
  g.clear();
  console.log('g.clear() worked');
} catch(e) {
  console.log('g.clear() failed', e.message);
}

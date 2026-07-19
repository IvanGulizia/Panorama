import { Graphics, GraphicsContext } from 'pixi.js';
const ctx = new GraphicsContext();
const g = new Graphics(ctx);
console.log('g.context =', g.context === ctx);
const g2 = new Graphics({ context: ctx });
console.log('g2.context =', g2.context === ctx);

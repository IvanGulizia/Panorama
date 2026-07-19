import { Container, Graphics, GraphicsContext } from 'pixi.js';
const ctx = new GraphicsContext();
const g = new Graphics(ctx);
const c = new Container();
c.addChild(g);
c.destroy(true); // destroy children too
console.log(ctx._activePath);

import { GraphicsContext } from 'pixi.js';
const ctx = new GraphicsContext();
ctx.beginPath();
ctx.rect(0, 0, 10, 10);
ctx.fill();
console.log("before clear", ctx._activePath);
ctx.clear();
console.log("after clear", ctx._activePath);

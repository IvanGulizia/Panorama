const { GraphicsContext } = require('pixi.js');
const ctx = new GraphicsContext();
ctx.rect(0, -5000, 100, 10000);
ctx.fill({ color: '#000000', alpha: 0 });
console.log('done2');

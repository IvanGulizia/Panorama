import { Application, Container, Graphics } from 'pixi.js';
import 'pixi.js/advanced-blend-modes';

(async () => {
  const app = new Application();
  await app.init({ width: 800, height: 600 });
  const c = new Container();
  const g = new Graphics().rect(0,0,100,100).fill(0xff0000);
  c.addChild(g);
  c.isRenderGroup = true;
  c.blendMode = 'difference';
  app.stage.addChild(c);
  app.render();
  console.log('rendered without error');
})();

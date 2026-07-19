import { Container, Application } from 'pixi.js';

const app = new Application();
await app.init({ width: 800, height: 600 });
const c = new Container();
app.stage.addChild(c);
c.destroy({ children: true });
app.render();

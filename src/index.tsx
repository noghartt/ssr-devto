import Koa from 'koa';
import Router from '@koa/router';
import http from 'http';
import { renderToPipeableStream } from 'react-dom/server';

import { App } from './App';

const router = new Router();
const app = new Koa();

router.get('/(.*)', async (ctx) => {
  let didError = false;

  try {
    // Wraps into a promise to force Koa to wait for the render to finish
    return new Promise((_resolve, reject) => {
      const { pipe, abort } = renderToPipeableStream(
        <App />,
        {
          bootstrapModules: ['./client.js'],
          onShellReady() {
            ctx.respond = false;
            ctx.status = didError ? 500 : 200;
            ctx.set('Content-Type', 'text/html');
            pipe(ctx.res);
            ctx.res.end();
          },
          onShellError() {
            ctx.status = 500;
            abort();
            didError = true;
            ctx.set('Content-Type', 'text/html');
            ctx.body = '<!doctype html><p>Loading...</p><script src="clientrender.js"></script>';
            reject();
          },
          onError(error) {
            didError = true;
            console.error(error);
            reject();
          }
        },
      );

      setTimeout(() => {
        abort();
      }, 10_000);
    })
  } catch (err) {
    console.log(err);
    ctx.status = 500;
    ctx.body = 'Internal Server Error';
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const server = http.createServer(app.callback());

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});

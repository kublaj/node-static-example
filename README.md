# node-static-example

A example about how to build a static file server by node. See <https://blog.acrazing.me/post/how-build-static-server-by-node.html>.

## Install

```bash
# npm package
npm install -g node-static-example

# typings
# maybe need
typings install --save --global npm:.d.ts/node-static-example.d.ts
```

## Usage

- in terminal

  ```bash
  # show help
  static-server --help
  ```

- in modules

  ```ts
  import ServeStatic, {server, express} from 'node-static-example'

  // server Usage
  server({
    root: process.cwd(),
  }).listen(3000)

  // with express
  app.use(express({
    root: process.cwd(),
  }))

  // manual
  const serve = new ServeStatic({
    root: process.cwd(),
  })
  serve.serve('/test', req, res)
  ```

## License

[MIT](./LICENSE)
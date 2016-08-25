/**
 * @description
 * @author yangjunbao
 * @since 2016-08-25 15:27:45
 * @version 1.0.0.0
 * @file src/lib/server.ts
 * @desc src/lib/server.ts
 */

import {ServeStatic, ServeStaticOptions} from './ServeStatic'
import {createServer, Server} from 'http'
import {parse} from 'url'
import _debug = require('debug')
const debug = _debug('server')

export function server(options?: ServeStaticOptions) {
  const serve = new ServeStatic(options)
  return createServer((req, res) => {
    serve.serve(parse(req.url).pathname, req, res)
      .then((stats) => {
        debug('serve file: %s', stats.path)
      }, (err: Error) => {
        res.writeHead(500)
        res.end(err.message)
        debug('error: %s', err.message)
      })
  })
}
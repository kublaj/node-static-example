/**
 * @description
 * @author yangjunbao
 * @since 2016-08-25 15:13:18
 * @version 1.0.0.0
 * @file src/lib/express.ts
 * @desc src/lib/express.ts
 */
import {ServeStaticOptions, ServeStatic} from './ServeStatic'
import {ClientRequest, ServerResponse} from 'http'
import {RequestHandler} from 'express'

export function express(options?: ServeStaticOptions): RequestHandler {
  const server = new ServeStatic(options)
  return (req, res, next) => server.serve(req.path, req, res).catch(next)
}
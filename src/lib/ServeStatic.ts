/**
 * @description
 * @author yangjunbao
 * @since 2016-08-25 10:33:16
 * @version 1.0.0.0
 * @file src/lib/ServeStatic.ts
 * @desc src/lib/ServeStatic.ts
 * 
 * A static request should be:
 *  1. request method is get
 *  2. without request body
 *  3. maybe with accept header: gzip/deflate/plain
 *  4. maybe with If-Modified-Since header: 302 header
 *  5. maybe with range header: specified range
 *
 * handle work:
 * 
 *  1. parse request.url: get the target file(maybe not the pathname according to server router config)
 *  2. get file stat
 *  3. parse request.headers.If-Modified-Since
 *  4. parse request.headers.range
 *  5. parse request.headers.accept
 *  6. set response headers
 *  7. pipe file to response
 */

import {EventEmitter} from 'events'
import {IncomingMessage, ServerResponse} from 'http'
import assign = require('object-assign')
import {stat, statSync, Stats, createReadStream} from 'fs'
import {join} from 'path'
import {lookup} from 'mime'
import {createGzip, createDeflate} from 'zlib'

export interface ServeStaticOptions {
  root?: string
  index?: string[]
  gzip?: boolean
  deflate?: boolean
}

export interface FileStats extends Stats {
  path?: string
  etag?: string
  from?: number
  to?: number
  isRange?: boolean
  gzip?: boolean
  deflate?: boolean
  isNotModified?: boolean
}

export const ERR_MAP = {
  FILE_NOT_EXISTS: 'FILE_NOT_EXISTS',
}

export class Deferred<T> {
  promise: Promise<T>
  resolve: (data: T) => void
  reject: (reason: Error) => void
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
  error(reason: string = ERR_MAP.FILE_NOT_EXISTS) {
    this.reject(new Error(reason))
  }
}

export class ServeStatic {
  options: ServeStaticOptions
  constructor(options: ServeStaticOptions = {}) {
    this.options = assign({
      root: process.cwd(),
      index: ['index.html', 'index.htm'],
    }, options)
  }

  private setEtag(stats: FileStats) {
    stats.etag = JSON.stringify([stats.ino, stats.size, stats.mtime])
    return stats
  }

  private getStats(path: string) {
    const defer = new Deferred<FileStats>()
    const {root, index} = this.options
    stat(join(root, path), (err: Error, data: FileStats) => {
      if (err || (!index.length && data.isDirectory())) {
        return defer.error()
      } if (data.isDirectory()) {
        let resolved = false
        for (let i = 0; i < index.length; i++) {
          try {
            const fs: FileStats = statSync(join(root, path, index[i]))
            if (fs && fs.isFile()) {
              // only resolve real file, no link, no sub dir
              fs.path = join(root, path, index[i])
              defer.resolve(this.setEtag(fs))
              resolved = true
              break
            }
            // if file(directory) exists, pass
          } catch (e) { }
        }
        if (!resolved) {
          defer.error()
        }
      } else if (data.isFile()) {
        data.path = join(root, path)
        defer.resolve(this.setEtag(data))
      } else {
        defer.error()
      }
    })
    return defer.promise
  }

  private checkModify(stats: FileStats, req: IncomingMessage) {
    const mtime = Date.parse(req.headers['if-modified-since'])
    const etag = req.headers['if-none-match']
    stats.isNotModified = ((mtime && stats.mtime && mtime >= +stats.mtime)
      || (etag && stats.etag && etag === stats.etag))
    return stats
  }

  /**
   * parse range header
   * see https://tools.ietf.org/html/rfc7233#section-3.1 
   */
  private getRange(stats: FileStats, req: IncomingMessage) {
    const range = req.headers['range']
    if (!range || range.indexOf('bytes=') || ~range.indexOf(',')) {
      return stats
    }
    const ranges = range.split(/=|-/g)
    const from = parseInt(ranges[1], 10)
    const to = parseInt(ranges[2], 10)
    if (isNaN(from) && !isNaN(to)) {
      stats.from = stats.size - to
      stats.to = Math.max(stats.size - 1, 0)
    } else if (!isNaN(from) && isNaN(to)) {
      stats.to = Math.max(stats.size - 1, 0)
    } else {
      stats.from = from
      stats.to = to
    }
    if (
      !isNaN(stats.from)
      && stats.to
      && 0 <= stats.from
      && stats.from < stats.to
      && stats.to < stats.size
    ) {
      stats.isRange = true
    }
    return stats
  }

  private checkEncoding(stats: FileStats, req: IncomingMessage) {
    const accept = req.headers['accept-encoding']
    if (accept) {
      stats.gzip = accept.indexOf('gzip') > -1
      stats.deflate = accept.indexOf('deflate') > -1
    }
    return stats
  }

  /**
   * serve static according request
   * @param {string} path - the file path parsed by router
   * @param {ClientRequest} req - the request for get headers
   * @param {ServerResponse} res - the response
   * @returns {Promise} - the result Promise, if success, resolve, else reject, and without handle res
   */
  serve(path: string, req: IncomingMessage, res: ServerResponse) {
    const {gzip, deflate} = this.options
    return this.getStats(path)
      .then((stats) => this.checkModify(stats, req))
      .then((stats) => this.getRange(stats, req))
      .then((stats) => this.checkEncoding(stats, req))
      .then((stats) => {
        if (stats.isNotModified) {
          res.writeHead(304)
          res.end()
          return stats
        }
        res.setHeader('Etag', stats.etag)
        res.setHeader('Date', new Date().toUTCString())
        res.setHeader('Last-Modified', new Date(+stats.mtime).toUTCString())
        res.setHeader('Content-Type', lookup(stats.path))
        const raw = createReadStream(stats.path)
        // compress will ignore range
        // see https://lists.w3.org/Archives/Public/ietf-http-wg/2014JanMar/1179.html
        if (gzip && stats.gzip) {
          res.setHeader('Content-Encoding', 'gzip')
          // Unknown length entity should set this header
          // see https://tools.ietf.org/html/rfc7230#section-3.3.2
          // see https://tools.ietf.org/html/rfc7230#section-3.3.1
          // But! node core http module auto set this if not set `Content-Length`
          // see https://github.com/nodejs/node/blob/master/lib/_http_outgoing.js#L284
          // res.setHeader('Transfer-Encoding', 'gzip,chunked')
          raw.pipe(createGzip()).pipe(res)
        } else if (deflate && stats.deflate) {
          res.setHeader('Content-Encoding', 'deflate')
          raw.pipe(createDeflate()).pipe(res)
        } else if (stats.isRange) {
          res.writeHead(206, { 'Content-Range': `bytes ${stats.from}-${stats.to}/${stats.size}` })
          createReadStream(stats.path, {
            start: stats.from,
            end: stats.to,
          }).pipe(res)
        } else {
          raw.pipe(res)
        }
        return stats
      })
  }
}
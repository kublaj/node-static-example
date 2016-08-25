/**
 * @description
 * @author acrazing
 * @since 2016-08-25 10:31:28
 * @version 1.0.0.0
 * @file test/index.ts
 * @desc test/index.ts
 */
import {join} from 'path'
import {request, ClientResponse} from 'http'
import {Readable} from 'stream'
import {inflateSync, gunzipSync} from 'zlib'

import {server, Deferred} from '../lib'
server({
  root: join(process.cwd(), 'fake'),
  gzip: true,
  deflate: true,
}).listen(3000)

interface Res {
  res: ClientResponse,
  data: Buffer,
}

function get(path: string, headers: { [key: string]: string } = {}) {
  const d = new Deferred<Res>()
  request({
    host: 'localhost',
    port: 3000,
    path: path,
    headers: headers,
  }, (res) => {
    const bufs: any[] = []
    res.on('data', (chunk: any) => {
      bufs.push(chunk)
    })
    res.on('end', () => {
      const data = Buffer.concat(bufs)
      d.resolve({ res, data })

      console.log(data.length, data, data.toString('utf8'))
      console.log(res.headers)
    })
  }).end()
  return d.promise
}

Promise.resolve()
  .then(() => get('/empty.txt'))
  .then(() => get('/bin.doc'))
  .then(() => get('/fake.js'))
  .then(() => console.log('--------------------------------'))
  .then(() => get('/img.png'))
  .then(() => get('/img.png', { 'Accept-Encoding': 'gzip' }))
  .then((data) => console.log('gunzip:', gunzipSync(data.data)))
  .then(() => get('/img.png', { 'Accept-Encoding': 'deflate' }))
  .then((data) => console.log('inflate', inflateSync(data.data)))
  .then(() => console.log('--------------------------------'))
  .then(() => get('/bin.doc', { 'Range': 'bytes=1-' }))
  .then(() => get('/bin.doc', { 'Range': 'bytes=-2' }))
  .then(() => get('/bin.doc', { 'Range': 'bytes=-12' }))
  .then(() => get('/bin.doc', { 'Range': 'bytes=1-2' }))
  .then(() => get('/bin.doc', { 'Range': 'bytes=1-12' }))
  .then(() => get('/bin.doc', { 'Range': 'bytes=' }))
  .then(() => get('/bin.doc', { 'Range': 'bytes=1-2', 'Accept-Encoding': 'gzip' }))
  .then(() => process.exit(0))
  .catch(console.error.bind(console, 'error'))
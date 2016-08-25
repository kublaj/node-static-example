#!/usr/bin/env node
/**
 * @description
 * @author yangjunbao
 * @since 2016-08-25 15:12:33
 * @version 1.0.0.0
 * @file src/bin/static-server.ts
 * @desc src/bin/static-server.ts
 */


import {ServeStaticOptions, server} from '../lib'
import commander = require('commander')
const pkg = require('../package.json')
commander
  .version(pkg.version)
  .option('-p, --port [port]', 'listen tcp port', parseInt, 8080)
  .option('-h, --host [host]', 'listen host/ip', 'localhost')
  .option('-g, --gzip', 'gzip compress support')
  .option('-d, --deflate', 'deflate compress support')
  .option('-r, --root [path]', 'root directory')
  .option('-i, --index [index,...]', 'index files', (val: string) => val.split(','))
  .parse(process.argv)

const {port, host} = commander as any
server(commander).listen(port, host, () => {
  console.log(`\u001b[1;33mServer is running at ${String(host)}:${String(port)}\u001b[0m`)
})
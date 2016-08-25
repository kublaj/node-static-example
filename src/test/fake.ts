/**
 * @description
 * @author yangjunbao
 * @since 2016-08-25 15:55:09
 * @version 1.0.0.0
 * @file src/test/fake.ts
 * @desc src/test/fake.ts
 */

import {writeFileSync} from 'fs'
import {join} from 'path'
import {Buffer} from 'buffer'
const root = join(process.cwd(), 'fake')
const buf = new Buffer([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10])
console.log(buf)
writeFileSync(join(root, 'empty.txt'), '')
writeFileSync(join(root, 'img.png'), buf)
writeFileSync(join(root, 'bin.doc'), buf)

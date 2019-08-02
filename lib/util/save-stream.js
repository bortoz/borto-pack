/** @babel */

import { PassThrough } from 'stream';

export default class SaveStream extends PassThrough {
  static CHUNK_SIZE = 512;

  buffer = '';

  _transform(chunk, encoding, callback) {
    if (this.buffer.length <= SaveStream.CHUNK_SIZE) {
      this.buffer += chunk;
      if(this.buffer.length > SaveStream.CHUNK_SIZE) {
        this.buffer = this.buffer.slice(0, SaveStream.CHUNK_SIZE).concat('...');
      }
    }
    super._transform(chunk, encoding, callback);
  }

  getData() {
    return this.buffer;
  }
}

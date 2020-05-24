/** @babel */

import { Emitter } from 'atom';
import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import pump from 'pump';
import through from 'through2';

export default class Testcase {

  constructor(props) {
    this.emitter = new Emitter();

    this.cancelled = false;
    this.running = false;
    this.gone = false;

    Object.assign(this, props);
    this.title = `Testcase #${/^(?:.*input[-_.]?)?(.+?)(?:\.[^.]+?)?$/.exec(this.inputFile)[1]}`;
    this.outputFile = this.inputFile.replace(/input/g, 'output').replace(/\.in$/, '.out');
    this.inputPath = path.join(this.dir, 'input', this.inputFile);
    this.outputPath = path.join(this.dir, 'output', this.outputFile);

    this.inputData = '';
    this.outputData = '';
    this.errorData = '';
    this.result = 'pending';
    this.message = 'Pending';
    this.displayOutput = '';
  }

  start() {
    if (this.cancelled) {
      this.exit(1);
      return;
    }

    this.child = child_process.spawn(this.command, this.args, this.options);
    this.startTimestamp = Date.now();

    let timeLimit = atom.config.get('borto-pack.multiRunTimeout');
    if (timeLimit > 0) {
      setTimeout(() => {
        this.errorFlag = 'TLE';
        this.child.kill();
      }, timeLimit);
    }

    let streamInput = fs.createReadStream(this.inputPath);
    pump(streamInput, through((chunk, enc, callback) => {
      if (this.inputData.length < 500) this.inputData += chunk;
      if (this.inputData.length > 500) this.inputData = this.inputData.slice(0, 497) + '...';
      callback(null, chunk);
    }), this.child.stdin);

    let streamOutput = fs.createWriteStream(this.outputPath);
    pump(this.child.stdout, through((chunk, enc, callback) => {
      if (this.outputData.length < 500) this.outputData += chunk;
      if (this.outputData.length > 500) this.outputData = this.outputData.slice(0, 497) + '...';
      callback(null, chunk);
    }), streamOutput);

    pump(this.child.stderr, through((chunk, enc, callback) => {
      if (this.errorData.length < 500) this.errorData += chunk;
      if (this.errorData.length > 500) this.errorData = this.errorData.slice(0, 497) + '...';
      callback();
    }));

    this.child.on('exit', (code, signal) => this.exit(code, signal));

    this.running = true;
    this.emitter.emit('start');
  }

  exit(code, signal) {
    this.endTimestamp = Date.now();
    this.running = false;

    if (this.errorFlag) {
      this.result = 'error';
      this.message = this.errorFlag;
      this.displayOutput = this.outputData.trimEnd();
    } else if (signal || code) {
      this.result = 'error';
      this.message = signal || 'RTE';
      this.displayOutput = this.errorData.trimEnd();
    } else {
      this.result = 'success';
      this.message = ((this.endTimestamp - this.startTimestamp) / 1000).toFixed(1) + 's';
      this.displayOutput = this.outputData.trimEnd();
    }

    this.gone = true;
    this.emitter.emit('exit');
  }

  cancel() {
    if (this.child !== undefined) {
      this.child.kill();
    }
    this.errorFlag = 'KILLED';
    this.cancelled = true;
    this.emitter.emit('cancel');
  }

  getId() {
    return this.id;
  }

  getTitle() {
    return this.title;
  }

  getState() {
    if (this.running) {
      return 'running';
    } else if (this.gone) {
      return 'resolved';
    } else {
      return 'pending';
    }
  }

  getFileAttrs() {
    return {
      'source-file': this.filePath,
      'input-file': this.inputPath,
      'output-file': this.outputPath,
    };
  }

  getResult() {
    return this.result;
  }

  getMessage() {
    return this.message;
  }

  getInput() {
    return this.inputData;
  }

  getOutput() {
    return this.displayOutput;
  }

  onStart(callback) {
    return this.emitter.on('start', callback);
  }

  onExit(callback) {
    return this.emitter.on('exit', callback);
  }

  onCancel(callback) {
    return this.emitter.on('cancel', callback);
  }
}

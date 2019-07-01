/** @babel */

import { Disposable } from 'atom';
import { PassThrough } from 'stream';
import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import pump from 'pump';
import TestcasePanel from './views/testcase-panel';

export default class TestcaseRunner extends Disposable {
  constructor(inputFile, dir, command, args, options) {
    super();
    let inputPath = path.join(dir, 'input', inputFile);
    let outputFile = inputFile.replace(/^input/, 'output').replace(/\.in$/, '.out');
    let outputPath = path.join(dir, 'output', outputFile);
    let streamInput = fs.createReadStream(inputPath);
    let streamOutput = fs.createWriteStream(outputPath);
    let saveInput = new SaveStream();
    let saveOutput = new SaveStream();
    this.child = child_process.spawn(command, args, options);
    let notificationOptions = {
      dismissable: true,
      buttons: [
        {
          text: 'Terminate process',
          onDidClick: () => { this.child.kill(); }
        }
      ]
    };
    let notification = atom.notifications.addInfo(`<strong>Running on: ${inputFile}</strong>`, notificationOptions);
    pump(streamInput, saveInput, this.child.stdin);
    pump(this.child.stdout, saveOutput, streamOutput);
    this.child.on('exit', async (code, signal) => {
      notification.dismiss();
      if (signal) {
        atom.notifications.addError(`<strong>Process killed on: ${inputFile}</strong>`);
      } else if (code) {
        atom.notifications.addError(`<strong>Runtime error on: ${inputFile}</strong>`);
      } else {
        atom.notifications.addSuccess(`<strong>Successful run on: ${inputFile}</strong>`);
        let input = saveInput.getData();
        let output = saveOutput.getData();
        let testcasePanel = atom.workspace.paneForURI(TestcasePanel.TESTCASE_PANEL_URI);
        if (testcasePanel) {
          testcasePanel = testcasePanel.activeItem;
        } else {
          testcasePanel = await atom.workspace.open(TestcasePanel.TESTCASE_PANEL_URI);
        }
        let match = /^input[-_.]?(.+)\..+?$/.exec(inputFile) || /^(.+)\..+?$/.exec(inputFile);
        let title = 'Testcase'.concat(match ? ` #${match[1]}` : '');
        testcasePanel.addTestcase(title, input, output);
      }
    });
  }

  dispose() {
    this.child.kill();
    super.dispose();
  }
}

class SaveStream extends PassThrough {
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

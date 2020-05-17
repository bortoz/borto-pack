/** @babel */

import { CompositeDisposable, Disposable, Emitter } from 'atom';
import path from 'path';
import CompilerMessage from './compiler-message';

export default class CompilerParser {

  constructor(log) {
    this.disposables = new CompositeDisposable();
    this.emitter = new Emitter();

    this.messages = [];
    this.log = log;
  }

  init() {
    let re_linker = /^(?:.*\.o:)?(.+?):(?:(\d+|\(.*\)):)?\s+((?:undefined reference to|could not read symbols|cannot open).*)$/gm;
    while (match = re_linker.exec(this.log)) {
      this.messages.push(new CompilerMessage({
        file: match[1],
        line: match[2],
        type: 'error',
        text: match[3],
      }));
    }

    let re_compiler = /^(.+?):(\d+):(\d+):\s+(note|warning|error|fatal error):\s+(.+)(?:\r?\n[^\r\n]*\r?\n[^~^\r\n]*([~^][~^ ]*))?$/gm;
    while (match = re_compiler.exec(this.log)) {
      this.messages.push(new CompilerMessage({
        file: match[1],
        line: match[2],
        column: match[3],
        type: match[4],
        text: this.clear(match[5]),
        range: match[6],
      }));
    }

    this.editors = new Set();

    this.disposables.add(
      atom.workspace.observeTextEditors((editor => this.updateEditor(editor))),
      atom.config.observe('borto-pack.linter', value => {
        for (let message of this.messages) {
          message.updateLinterLevel(value);
        }
      }),
    );
  }

  destroy() {
    for (let message of this.messages) {
      message.destroy();
    }
    this.disposables.dispose();
    this.emitter.dispose();
  }

  getMessages() {
    return this.messages;
  }

  getRawLog() {
    return this.log;
  }

  clear(text) {
    return text.replace(/\s+\{aka '.+?'\}/g, '').replace(/\s+\[with .+?\]/g, '').replace(/\s+\[-W.+?\]/g, '');
  }

  updateEditor(editor) {
    if (!editor) return;
    if (this.editors.has(editor)) return;
    this.editors.add(editor);
    let file = editor.getBuffer().getPath();
    if (!file) return;
    let gutter = editor.gutterWithName('borto-gutter');

    for (let message of this.messages) {
      if (file === message.getFilepath()) {
        message.bind(editor);
      }
    }

    this.disposables.add(editor.onDidChange(() => this.emitter.emit('change')));
  }

  onBufferChange(callback) {
    return this.emitter.on('change', callback);
  }
}

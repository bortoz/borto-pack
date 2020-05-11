/** @babel */
/** @jsx etch.dom */

import { CompositeDisposable } from 'atom';
import etch from 'etch';
import fs from 'fs';
import path from 'path';
const fsp = fs.promises;

export default class CompilerPanel {
  static COMPILER_PANEL_URI = 'atom://borto-pack/compiler';

  constructor() {
    this.priority = {
      'note': 0,
      'warning': 1,
      'error': 2,
      'fatal error': 3
    };
    this.maxLevel = 2;
    this.level = 0;
    this.messages = [];
    this.rawLog = '';
    this.gutter = null;
    this.decorations = [];
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.workspace.onDidChangeActiveTextEditor(editor => this.updateMarkers(editor))
    );
    etch.initialize(this);
  }

  async destroy() {
    this.decorations.forEach(d => d.destroy());
    if (this.gutter) this.gutter.destroy();
    this.disposables.dispose();
    await etch.destroy(this);
  }

  render() {
    return (
      <div class='borto-log-panel'>
        <div class='borto-log-pre-container borto-log-message'
                style={`display: ${this.level === -1 ? 'block' : 'none'};`}>
          <pre class='borto-log-pre'>{this.rawLog}</pre>
        </div>
        <div class='borto-log-table-container'
                style={`display: ${this.level !== -1 ? 'block' : 'none'};`}>
          <table class='borto-log-table'>
            <thead>
              <tr>
                <td class='borto-log-head column1' />
                <td class='borto-log-head column2'>File</td>
                <td class='borto-log-head column3'>Message</td>
              </tr>
            </thead>
            <tbody>
              {this.messages.map(m => {
                return (
                  <tr style={`display: ${this.priority[m.type] >= this.level ? 'table-row' : 'none'};`}>
                    <td class={'borto-log-cell column1 ' + m.type} />
                    <td class='borto-log-cell column2'>
                      <div class='borto-log-content'>
                        <pre class='borto-log-fit-content'
                                onclick={e => this.openFile(m.file)}>
                          {m.file.realname}
                        </pre>
                      </div>
                    </td>
                    <td class='borto-log-cell column3 borto-log-message'>
                      <div class='borto-log-content'>
                        <pre class='borto-log-fit-content'>
                          {m.text}
                        </pre>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div class='borto-log-selector'>
          <button class={'btn btn-default borto-log-button error' + (this.level === 2 ? ' selected' : '')}
                  disabled={this.maxLevel < 2}
                  onclick={e => this.setLevel(2)}>
            Error
          </button>
          <button class={'btn btn-default borto-log-button warning' + (this.level === 1 ? ' selected' : '')}
                  disabled={this.maxLevel < 1}
                  onclick={e => this.setLevel(1)}>
            Warning
          </button>
          <button class={'btn btn-default borto-log-button info' + (this.level === 0 ? ' selected' : '')}
                  disabled={this.maxLevel < 0}
                  onclick={e => this.setLevel(0)}>
            Info
          </button>
          <button class={'btn btn-default borto-log-button info' + (this.level === -1 ? ' selected' : '')}
                  onclick={e => this.setLevel(-1)}>
            Raw
          </button>
        </div>
      </div>
    );
  }

  update() {
    return etch.update(this);
  }

  setLevel(level) {
    this.level = level;
    this.update();
  }

  setMessages(messages, rawLog) {
    this.maxLevel = 2;
    while (this.maxLevel >= 0 && !messages.find(m => this.priority[m.type] >= this.maxLevel)) {
      this.maxLevel--;
    }
    this.level = Math.min(0, this.maxLevel);
    this.messages = messages;
    this.rawLog = rawLog;
    this.updateMarkers(atom.workspace.getActiveTextEditor());
    this.update();
  }

  updateMarkers(editor) {
    this.decorations.splice(0, this.decorations.length).forEach(d => d.destroy());
    if (this.gutter) {
      this.gutter.destroy();
      this.gutter = null;
    }
    let linterLevel = atom.config.get('borto-pack.linter');
    if (linterLevel == 0 || !editor) return;
    this.gutter = editor.addGutter({
      name: 'borto-gutter',
      priority: 1,
      type: 'decorated',
    });
    let file = editor.getBuffer().getPath();
    if (!file) return;
    for (let message of this.messages) {
      if (message.type === 'note') continue;
      if (path.resolve(message.file.name) !== path.resolve(file)) continue;
      let className = message.type.split(' ').join('-');
      if (message.file.startColumn !== undefined && message.file.endColumn !== undefined) {
        let marker = editor.getBuffer().markRange([[message.file.line - 1, message.file.startColumn - 1], [message.file.line - 1, message.file.endColumn - 1]], {
          invalidate: 'touch'
        });
        this.decorations.push(this.gutter.decorateMarker(marker, {
          type: 'gutter',
          class: 'borto-gutter ' + className,
        }));
        if (linterLevel == 2) {
          this.decorations.push(editor.decorateMarker(marker, {
            type: 'text',
            class: 'borto-text-decoration ' + className,
          }));
        }
      } else {
        let marker = editor.getBuffer().markRange([[message.file.line - 1, 0], [message.file.line - 1, editor.getBuffer().lineForRow(message.file.line - 1).length]], {
          invalidate: 'touch'
        });
        this.decorations.push(this.gutter.decorateMarker(marker, {
          type: 'gutter',
          class: 'borto-gutter ' + className,
        }));
      }
    }
  }

  async openFile(file) {
    try {
      await fsp.access(file.name);
      var editor = await atom.workspace.open(file.name);
      if (file.line) {
        if (!file.column) {
          file.column = editor.getBuffer().lineForRow(file.line - 1).search(/\S|$/) + 1;
        }
        editor.setCursorBufferPosition([file.line - 1, file.column - 1]);
      }
    } catch (error) {
      atom.notifications.addError('<strong>File sorgente non trovato</strong>');
    }
  }

  getTitle() {
    return 'Compiler Log';
  }

  getURI() {
    return CompilerPanel.COMPILER_PANEL_URI;
  }

  getDefaultLocation() {
    return 'bottom';
  }
}

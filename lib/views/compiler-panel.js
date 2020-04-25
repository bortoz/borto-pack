/** @babel */
/** @jsx etch.dom */

import etch from 'etch';

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
    etch.initialize(this);
  }

  async destroy() {
    await etch.destroy(this);
  }

  render() {
    return (
      <div class='borto-log-panel'>
        <div class='borto-log-pre-container' style={`display: ${this.level === -1 ? 'block' : 'none'};`}>
          <pre class='borto-log-pre'>{this.rawLog}</pre>
        </div>
        <div class='borto-log-table-container' style={`display: ${this.level !== -1 ? 'block' : 'none'};`}>
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
                      <div class='borto-log-content column2'>
                        <div class='borto-log-fit-content column2' onclick={() => m.file.open()}>{m.file.realname}</div>
                      </div>
                    </td>
                    <td class='borto-log-cell column3'>
                      <div class='borto-log-content4'>{m.text}</div>
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
                  onclick={() => this.setLevel(2)}>
            Error
          </button>
          <button class={'btn btn-default borto-log-button warning' + (this.level === 1 ? ' selected' : '')}
                  disabled={this.maxLevel < 1}
                  onclick={() => this.setLevel(1)}>
            Warning
          </button>
          <button class={'btn btn-default borto-log-button info' + (this.level === 0 ? ' selected' : '')}
                  disabled={this.maxLevel < 0}
                  onclick={() => this.setLevel(0)}>
            Info
          </button>
          <button class={'btn btn-default borto-log-button info' + (this.level === -1 ? ' selected' : '')}
                  onclick={() => this.setLevel(-1)}>
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
    this.level = Math.min(this.maxLevel, this.level);
    this.messages = messages;
    this.rawLog = rawLog;
    this.update();
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

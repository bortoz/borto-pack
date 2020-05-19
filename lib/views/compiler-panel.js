/** @babel */
/** @jsx etch.dom */

import etch from 'etch';
import CompilerParser from '../util/compiler-parser';

export default class CompilerPanel {
  static COMPILER_PANEL_URI = 'atom://borto-pack/compiler-panel';

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
    this.parser = null;
    this.focus = null;
    etch.initialize(this);
  }

  async destroy() {
    if (this.parser) this.parser.destroy();
    await etch.destroy(this);
  }

  render() {
    return (
      <div className='borto-log-panel' attributes={{ tabindex: -1 }}>
        <div className={'borto-log-pre-container borto-log-message' + (this.level !== -1 ? ' hidden' : '')}>
          <pre className='borto-log-pre'>{this.rawLog}</pre>
        </div>
        <div className={'borto-log-table-container' + (this.level === -1 ? ' hidden' : '')}>
          <table className='borto-log-table'>
            <thead>
              <tr>
                <td className='borto-log-head column1' />
                <td className='borto-log-head column2'>File</td>
                <td className='borto-log-head column3'>Message</td>
              </tr>
            </thead>
            <tbody ref='tbody'>
              {this.getMessages().map(m => {
                return (
                  <tr className={`borto-log-row ${m.getType()}${this.priority[m.getType()] < this.level ? ' hidden' : ''}`}>
                    <td className='borto-log-cell column1'>
                      <span className='icon'></span>
                    </td>
                    <td className='borto-log-cell column2 borto-log-file'
                            attributes={m.getFileAttrs()}>
                      <div className='borto-log-content'>
                        <pre className='borto-log-fit-content'
                                onclick={e => m.open()}>
                          {m.getFilename()}
                          <span className={(m.getPosition() !== undefined ? '' : 'hidden')}>
                            :{m.getPosition() ? (m.getPosition().row + 1) : ''}
                          </span>
                        </pre>
                      </div>
                    </td>
                    <td className='borto-log-cell column3 borto-log-message'>
                      <div className='borto-log-content'>
                        <pre className='borto-log-fit-content'>
                          {m.getText()}
                        </pre>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className='borto-log-selector'>
          <div className='btn-group'>
            <button className={`btn btn-${this.level === 2 ? 'error' : 'default'} borto-log-button icon-flame`}
                    disabled={this.maxLevel < 2}
                    onclick={e => this.setLevel(2)}>
              Error
            </button>
            <button className={`btn btn-${this.level === 1 ? 'warning' : 'default'} borto-log-button  icon-alert`}
                    disabled={this.maxLevel < 1}
                    onclick={e => this.setLevel(1)}>
              Warning
            </button>
            <button className={`btn btn-${this.level === 0 ? 'info' : 'default'} borto-log-button  icon-info`}
                    disabled={this.maxLevel < 0}
                    onclick={e => this.setLevel(0)}>
              Note
            </button>
            <button className={`btn btn-${this.level === -1 ? 'info' : 'default'} borto-log-button  icon-file`}
                    onclick={e => this.setLevel(-1)}>
              Raw
            </button>
          </div>
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

  setParser(parser) {
    if (this.parser) this.parser.destroy();
    this.parser = parser;
    if (this.parser) {
      this.rawLog = parser.getRawLog();
      parser.init();
      parser.onBufferChange(() => this.update());
      for (let message of this.getMessages()) {
        message.onClick(e => this.focusMessage(message));
      }
    }
    this.maxLevel = 2;
    while (this.maxLevel >= 0 && !this.getMessages().find(m => this.priority[m.getType()] >= this.maxLevel)) {
      this.maxLevel--;
    }
    this.level = Math.min(0, this.maxLevel);
    this.update();
  }

  focusMessage(message) {
    this.unfocusMessage();
    while (this.priority[message.getType()] < this.level) {
      this.level--;
    }
    this.update();
    let index = this.getMessages().indexOf(message);
    let row = this.refs.tbody.children[index];
    row.scrollIntoView({ block: 'center' });
    row.classList.add('borto-log-highlight');
    let timeout = setTimeout(() => {
      this.unfocusMessage();
    }, 500);
    this.focus = {
      index: index,
      timeout: timeout,
    };
  }

  unfocusMessage() {
    if (this.focus !== null) {
      let { index, timeout } = this.focus;
      this.refs.tbody.children[index].classList.remove('borto-log-highlight');
      clearTimeout(timeout);
      this.focus = null;
    }
  }

  getMessages() {
    return this.parser ? this.parser.getMessages() : [];
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

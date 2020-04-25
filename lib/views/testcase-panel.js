/** @babel */
/** @jsx etch.dom */

import etch from 'etch';

export default class TestcasePanel {
  static TESTCASE_PANEL_URI = 'atom://borto-pack/testcase';

  constructor() {
    this.testcases = [];
    etch.initialize(this);
  }

  update() {
    return etch.update(this);
  }

  async destroy() {
    await etch.destroy(this);
  }

  render() {
    return (
      <div className='borto-testcase-panel' >
        {this.testcases.map(props => {
          return (
            <div id={props.id} class='borto-testcase'>
              <div class='borto-testcase-header'>
                <div class={'borto-testcase-title' + (props.state === 'resolved' ? ' resolved' : '')}
                        onclick={e => { if (props.state === 'resolved') this.toggleTestcase(props.id); }}
                        ref={props.id + '-title'}>
                  {props.name}
                </div>
                <span class='borto-testcase-message pending'
                        style={`display: ${props.state === 'pending' ? 'block' : 'none'};`}>
                  Pending
                </span>
                <button class='btn btn-default borto-testcase-button'
                        style={`display: ${props.state === 'running' ? 'block' : 'none'};`}
                        onclick={() => props.kill()}>
                  kill
                </button>
                <span class={'borto-testcase-message ' + props.result}
                        style={`display: ${props.state === 'resolved' ? 'block' : 'none'};`}>
                  {props.message}
                </span>
              </div>
              <div class='borto-testcase-content'
                      ref={props.id + '-content'}
                      style={`display: ${props.state === 'resolved' ? 'block' : 'none'};`}>
                <div class="borto-testcase-box">
                  <pre class="borto-testcase-pre">{props.input}</pre>
                </div>
                <div class="borto-testcase-box" style={`display: ${props.output ? 'block' : 'none'};`}>
                  <pre class="borto-testcase-pre">{props.output}</pre>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  addTestcase(id, name, kill) {
    this.testcases.push({
      id: id,
      name: name,
      input: '',
      output: '',
      message: '',
      state: 'pending',
      result: ''
    });
    this.update();
  }

  startTestcase(id, kill) {
    let x = this.testcases.findIndex(t => t.id === id);
    if (x == -1) return;
    Object.assign(this.testcases[x], {
      state: 'running',
      kill: kill
    });
    this.update();
  }

  resolveTestcase(id, input, output, message, result) {
    let x = this.testcases.findIndex(t => t.id === id);
    if (x == -1) return;
    Object.assign(this.testcases[x], {
      input: input,
      output: output,
      message: message,
      state: 'resolved',
      result: result,
    });
    this.update();
  }

  toggleTestcase(id) {
    this.refs[id + '-title'].classList.toggle('expanded');
    let content = this.refs[id + '-content'];
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + 'px';
    }
  }

  clearTestcase() {
    this.testcases.forEach(t => {
      if (t.kill) t.kill();
    });
    this.testcases = [];
    this.update();
  }

  getTitle() {
    return 'Testcases';
  }

  getURI() {
    return TestcasePanel.TESTCASE_PANEL_URI;
  }

  getDefaultLocation() {
    return 'right';
  }
}

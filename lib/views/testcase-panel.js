/** @babel */
/** @jsx etch.dom */

import etch from 'etch';

export default class TestcasePanel {
  static TESTCASE_PANEL_URI = 'atom://borto-pack/testcase-panel';

  constructor() {
    this.testcases = [];
    etch.initialize(this);
  }

  update() {
    return etch.update(this);
  }

  async destroy() {
    for (let tc of this.testcases) {
      tc.cancel();
    }
    await etch.destroy(this);
  }

  render() {
    return (
      <div className='borto-testcase-panel tree-view' >
        <ul className='list-tree has-collapsable-children'>
          {this.testcases.map(tc => {
            return (
              <li id={tc.getId()} className='list-nested-item collapsed' ref={tc.getId()} >
                <div className={'borto-testcase list-item ' + tc.getState()} attributes={tc.getFileAttrs()}>
                  <div className='borto-testcase-header'>
                    <div className='borto-testcase-title'
                            onclick={e => tc.getState() === 'resolved' ? this.toggleTestcase(tc.getId()) : null}>
                      {tc.getTitle()}
                    </div>
                    <button class='btn btn-default borto-testcase-button'
                            onclick={() => tc.cancel()}>
                      Kill
                    </button>
                    <span class={'borto-testcase-message highlight-' + tc.getResult()}>
                      {tc.getMessage()}
                    </span>
                  </div>
                  <div className='borto-testcase-content' ref={tc.getId() + '-content'} >
                    <div className='borto-testcase-box'>
                      <pre className='borto-testcase-pre'>{tc.getInput()}</pre>
                    </div>
                    <div className={`borto-testcase-box${tc.getOutput().length > 0 ? '' : ' hidden'}`}>
                      <pre className='borto-testcase-pre'>{tc.getOutput()}</pre>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  setTestcases(testcases) {
    for (let tc of this.testcases) {
      tc.cancel();
    }
    this.testcases = testcases;
    for (let tc of this.testcases) {
      tc.onStart(() => this.update());
      tc.onExit(() => this.update());
    }
    this.update();
  }

  toggleTestcase(id) {
    let tc = this.refs[id];
    let content = this.refs[id + '-content'];
    if (tc.classList.contains('collapsed')) {
      tc.classList.remove('collapsed');
      content.style.maxHeight = content.scrollHeight + 'px';
    } else {
      tc.classList.toggle('collapsed');
      content.style.maxHeight = null;
    }
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

/** @babel */
/** @jsx etch.dom */

import etch from 'etch';

export default class TestcasePanel {
  static TESTCASE_PANEL_URI = 'atom://borto-pack/testcase';

  constructor(properties) {
    this.properties = properties;
    etch.initialize(this);
  }

  async destroy() {
    await etch.destroy(this);
  }

  render() {
    return <div className='borto-pack-panel' />;
  }

  addTestcase(name, kill) {
    let testcase = document.createElement('div');
    testcase.className = 'borto-pack-testcase';
    this.element.appendChild(testcase);
    testcase.innerHTML =
      `<div class='borto-pack-testcase-header'>` +
        `<div class='borto-pack-testcase-title'>${name}</div>` +
        `<button class='btn btn-default borto-pack-testcase-button'>kill</button>` +
      `</div>`;
    testcase.firstChild.lastChild.onclick = kill;
  }

  resolveTestcase(id, input, output, msg) {
    let child = this.element.children[id];
    let header = child.firstChild;
    let title = header.firstChild;
    title.classList.add('resolved');
    header.removeChild(header.lastChild);
    let content = document.createElement('div');
    content.className = 'borto-pack-testcase-content';
    child.appendChild(content);
    content.innerHTML =
      `<div class='borto-pack-testcase-box'>` +
        `<pre class='borto-pack-testcase-pre'>${input}</pre>` +
      `</div>` +
      `<div class='borto-pack-testcase-box'>` +
        `<pre class='borto-pack-testcase-pre'>${output}</pre>` +
      `</div>`;
    title.onclick = function() {
      this.classList.toggle('expanded');
      let content = this.parentElement.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    };
    let message = document.createElement('span');
    message.className = 'borto-pack-testcase-message success';
    message.innerHTML = msg;
    header.appendChild(message);
  }

  rejectTestcase(id, msg) {
    let header = this.element.children[id].firstChild;
    header.removeChild(header.lastChild);
    let message = document.createElement('span');
    message.className = 'borto-pack-testcase-message error';
    message.innerHTML = msg;
    header.appendChild(message);
  }

  clearTestcase() {
    this.element.innerHTML = '';
  }

  update(properties) {
    this.properties = properties;
    return etch.update(this);
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

/** @babel */
/** @jsx etch.dom */

import etch from 'etch';
import TreeViewItem from './tree-view-item';

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
    return (
      <div className='borto-pack-panel'>
        {this.properties.testcases.map(tc => (
          <TreeViewItem title={tc.title}>
            <TreeViewItem title='Input'>
              <span>{tc.input}</span>
            </TreeViewItem>
            <TreeViewItem title='Output'>
              <span>{tc.output}</span>
            </TreeViewItem>
          </TreeViewItem>
        ))}
      </div>
    );
  }

  addTestcase(name, input, output) {
    let properties = {};
    Object.assign(properties, this.properties);
    properties.testcases.push({
      title: name,
      input: input,
      output: output
    });
    this.update(properties);
  }

  clearTestcase() {
    let properties = {};
    Object.assign(properties, this.properties);
    properties.testcases = [];
    this.update(properties);
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

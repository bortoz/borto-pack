/** @babel */
/** @jsx etch.dom */

import etch from 'etch';
import Collapsible from './collapsible';
import TestcaseBox from './testcase-box';

export default class TestcaseWrapper {
  constructor(properties) {
    this.properties = properties;
    etch.initialize(this);
  }

  async destroy() {
    await etch.destroy(this);
  }

  render() {
    let { title, input, output } = this.properties;
    return (
      <Collapsible title={title}>
        <TestcaseBox content={input}/>
        <TestcaseBox content={output}/>
      </Collapsible>
    );
  }

  update(properties) {
    this.properties = properties;
    return etch.update(this);
  }
}

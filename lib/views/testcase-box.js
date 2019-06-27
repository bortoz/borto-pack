/** @babel */
/** @jsx etch.dom */

import etch from 'etch';

export default class TestcaseBox {
  constructor(properties, children) {
    this.properties = properties;
    this.children = children;
    etch.initialize(this);
  }

  async destroy() {
    await etch.destroy(this);
  }

  render() {
    return (
      <div className='borto-pack-testcase-box'>
        <pre className='borto-pack-testcase-pre'>{this.children}</pre>
      </div>
    );
  }

  update(properties) {
    this.properties = properties;
    return etch.update(this);
  }
}

/** @babel */
/** @jsx etch.dom */

import etch from 'etch';

export default class TestcaseBox {
  constructor(properties) {
    this.properties = properties;
    etch.initialize(this);
  }

  async destroy() {
    await etch.destroy(this);
  }

  render() {
    let { content } = this.properties;
    return (
      <div className='borto-pack-testcase-box'>
        <pre className='borto-pack-testcase-pre'>{content}</pre>
      </div>
    );
  }

  update(properties) {
    this.properties = properties;
    return etch.update(this);
  }
}

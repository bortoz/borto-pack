/** @babel */
/** @jsx etch.dom */

import etch from 'etch';

export default class Collapsible {
  constructor(properties, children) {
    this.properties = properties;
    this.children = children;
    etch.initialize(this);
  }

  async destroy() {
    await etch.destroy(this);
  }

  render() {
    let { title } = this.properties;
    return (
      <div className='borto-pack-collapsible'>
        <div className='borto-pack-collapsible-header' onclick={this.onClick}>
          {title}
        </div>
        <div className='borto-pack-collapsible-content'>
          {this.children}
        </div>
      </div>
    );
  }

  onClick() {
    this.classList.toggle('expanded');
    let content = this.nextElementSibling;
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
    }
  }

  update(properties) {
    this.properties = properties;
    return etch.update(this);
  }
}

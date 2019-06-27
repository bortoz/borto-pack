/** @babel */
/** @jsx etch.dom */

import etch from 'etch';

export default class Expandable {
  constructor(properties, children) {
    this.properties = properties;
    this.properties.expanded = false;
    this.children = children;
    etch.initialize(this);
  }

  async destroy() {
    await etch.destroy(this);
  }

  render() {
    let { title, expanded } = this.properties;
    let icon = expanded ? '\uf0a3' : '\uf078';
    return (
      <div className='borto-pack-expandable'>
        <div className='borto-pack-expandable-header' onclick={() => this.onClick()}>
          <span className='borto-pack-expandable-icon'>{icon}</span>
          <span className='borto-pack-expandable-title'>{title}</span>
        </div>
        {expanded ? this.children : null}
      </div>
    );
  }

  onClick() {
    let properties = {};
    Object.assign(properties, this.properties);
    properties.expanded = !properties.expanded;
    this.update(properties);
  }

  update(properties) {
    this.properties = properties;
    return etch.update(this);
  }
}

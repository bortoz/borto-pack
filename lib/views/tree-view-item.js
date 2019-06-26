/** @babel */
/** @jsx etch.dom */

import etch from 'etch';

export default class TreeViewItem {
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
      <div className='borto-tree-view-item'>
        <div className='borto-pack-tree-view-header' onclick={() => this.onClick()}>
          <span className='borto-pack-tree-view-icon'>{this.properties.expanded ? '\uf0a3' : '\uf078'}</span>
          <span className='borto-pack-tree-view-title'>{this.properties.title}</span>
        </div>
        {this.properties.expanded ? this.children : ''}
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

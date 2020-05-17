/** @babel */

import { Emitter, Point } from 'atom';
import { promises as fs } from 'fs';
import path from 'path';

export default class CompilerMessage {

  constructor(props) {
    this.emitter = new Emitter();

    Object.assign(this, props);

    this.line = parseInt(this.line);
    this.column = parseInt(this.column);
    if (isNaN(this.line)) this.line = undefined;
    if (isNaN(this.column)) this.column = undefined;

    if (this.range !== undefined) {
      this.start = this.column - Math.max(this.range.indexOf('^'), 0);
      this.end = this.start + this.range.length;
    }

    this.root = path.parse(this.file).root;
    this.file = path.resolve(this.file);
    this.basename = path.parse(this.file).base;

    this.classname = this.type.split(' ').join('-');
  }

  destroy() {
    if (this.markerPoint) this.markerPoint.destroy();
    if (this.markerRange) this.markerRange.destroy();
    this.emitter.dispose();
  }

  bind(editor) {
    if (this.line === undefined) return;
    let buffer = editor.getBuffer();
    let gutter = editor.gutterWithName('borto-gutter');
    let position = (this.column !== undefined)
      ? [this.line - 1, this.column - 1]
      : [this.line - 1, editor.getBuffer().lineForRow(this.line - 1).search(/\S|$/)];
    this.markerPoint = buffer.markPosition(position, { invalidate: 'never' });

    if (this.type === 'note') return;
    let range = (this.range !== undefined)
      ? [[this.line - 1, this.start - 1], [this.line - 1, this.end - 1]]
      : [[this.line - 1, 0], [this.line - 1, buffer.lineLengthForRow(this.line - 1)]];
    this.markerRange = buffer.markRange(range, { invalidate: 'touch' });

    let div = document.createElement('div');
    div.className = 'borto-gutter-marker ' + this.classname,
    this.decorationGutter = gutter.decorateMarker(this.markerRange, {
      type: 'gutter',
      class: 'borto-gutter',
      item: div,
    });
    div.onclick = e => this.emitter.emit('click', e);

    if (this.range === undefined) return;
    this.decorationText = editor.decorateMarker(this.markerRange, {
      type: 'text',
      class: 'borto-text-decoration ' + this.classname,
    });
  }

  updateLinterLevel(level) {
    if (this.decorationGutter) {
      let gutterProps = this.decorationGutter.getProperties();
      gutterProps.class = `borto-gutter${level <= 0 ? ' hide-decoration' : ''}`;
      this.decorationGutter.setProperties(gutterProps);
    }

    if (this.decorationText) {
      let textProps = this.decorationText.getProperties();
      textProps.class = `borto-text-decoration ${this.classname}${level <= 1 ? ' hide-decoration' : ''}`;
      this.decorationText.setProperties(textProps);
    }
  }

  getType() {
    return this.type;
  }

  getText() {
    return this.text;
  }

  getPosition() {
    if (this.markerPoint && !this.markerPoint.isDestroyed()) {
      return this.markerPoint.getStartPosition();
    } else if (this.line !== undefined) {
      return Point.fromObject([this.line - 1, (this.column - 1) || 1]);
    } else {
      return undefined;
    }
  }

  getFilepath() {
    return this.root ? this.file : undefined;
  }

  getFileAttrs() {
    let attr = {};
    let path = this.getFilepath();
    let pos = this.getPosition();
    if (path) {
      attr['data-path'] = path;
      if (pos) {
        attr['data-line'] = pos.row;
        attr['data-column'] = pos.column;
      }
    }
    return attr;
  }

  getFilename() {
    return this.basename;
  }

  async open() {
    try {
      let file = this.getFilepath();
      await fs.access(file);
      let position = this.getPosition();
      var editor = await atom.workspace.open(file, {
        initialLine: position ? position.row : undefined,
        initialColumn: position ? position.column : undefined,
      });
    } catch (error) {
      atom.notifications.addError('<strong>Source file not found</strong>');
    }
  }

  onClick(callback) {
    return this.emitter.on('click', callback);
  }
}

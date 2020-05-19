/** @babel */

import { CompositeDisposable } from 'atom';

export default class SelectionManager {

  constructor() {
    this.disposables = new CompositeDisposable();

    this.selections = new Map();
    this.disposables.add(atom.workspace.observeTextEditors(editor => {
      this.disposables.add(
        editor.onDidAddSelection(selection => this.addSelection(selection)),
        editor.onDidChangeSelectionRange(e => this.updateSelection(e.oldScreenRange, e.selection)),
        editor.onDidRemoveSelection(selection => this.removeSelection(selection)),
      );

      for (let selection of editor.getSelections()) {
        this.addSelection(selection);
      }
    }));
  }

  destroy() {
    for (let decoration of this.selections.values()) {
      decoration.getMarker().destroy();
    }
    this.disposables.dispose();
  }

  addSelection(selection) {
    let editor = selection.editor;
    let range = selection.getScreenRange();
    let marker = editor.markScreenRange(range, { invalidate: 'never' });
    let gutter = editor.gutterWithName('borto-gutter');
    let decoration = gutter.decorateMarker(marker, { type: 'gutter' });
    this.selections.set(selection.id, decoration);
    this.updateSelection(selection.getScreenRange(), selection);
  }

  updateSelection(prevRange, selection) {
    let range = selection.getScreenRange();
    let decoration = this.selections.get(selection.id);
    let marker = decoration.getMarker();

    for (let otherDecoration of this.selections.values()) {
      let otherMarker = otherDecoration.getMarker();
      let otherRange = otherMarker.getScreenRange();
      if (decoration !== otherDecoration && decoration.decorationManager === otherDecoration.decorationManager) {
        if (range.intersectsRowRange(otherRange.start.row, otherRange.end.row)) {
          range = range.union(otherRange);
          let otherProps = otherDecoration.getProperties();
          otherProps.class = 'borto-gutter line-number cursor-line cursor-line-no-selection';
          otherDecoration.setProperties(otherProps);
        } else if (prevRange.intersectsRowRange(otherRange.start.row, otherRange.end.row)) {
          let otherProps = otherDecoration.getProperties();
          if (otherRange.isEmpty()) {
            otherProps.class = 'borto-gutter line-number cursor-line cursor-line-no-selection';
          } else {
            otherProps.class = 'borto-gutter line-number cursor-line';
          }
          otherDecoration.setProperties(otherProps);
        }
      }
    }

    let props = decoration.getProperties();
    if (range.isEmpty()) {
      props.class = 'borto-gutter line-number cursor-line cursor-line-no-selection';
    } else {
      props.class = 'borto-gutter line-number cursor-line';
    }
    decoration.setProperties(props);

    if (!range.isSingleLine() && range.end.column === 0) {
      range.end.row--;
      range.end.column = Infinity;
    }
    marker.setScreenRange(range);
  }

  removeSelection(selection) {
    if (this.selections.has(selection.id)) {
      this.selections.get(selection.id).getMarker().destroy();
      this.selections.delete(selection.id);
    }
  }
}

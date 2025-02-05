import { Delta } from 'quill/core';

export interface Range {
  index: number;
  length: number;
}

export interface UndoRedoItem {
  delta: Delta;
  oldDelta: Delta;
  beforeSelection: Range | null;
  afterSelection: Range | null;
} 
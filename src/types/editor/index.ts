import { Delta } from 'quill/core';

export interface EditorSettings {
  wordHighlight: boolean
  fontSize: number
  audioRewindSeconds: number
  volume: number
  playbackSpeed: number
  useNativeContextMenu: boolean
  shortcuts: Record<string, string>
}

export type CTMType = {
  word: string;
  start: number;
  end: number;
  conf: number;
  punct: string;
  source: string;
  speaker: string;
  turn?: number;
};

export type AlignmentType = {
  word: string;
  type: 'meta' | 'ctm';
  start: number;
  end: number;
  conf: number;
  punct: string;
  source: string;
  speaker: string;
  case?: 'success' | 'mismatch'; 
  ctmIndex?: number;
  turn?: number;
  startPos?: number;
  endPos?: number;
}

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

export interface QCValidation {
  isValidationPassed: boolean
  playedPercentage: number
  werPercentage: number
  blankPercentage: number
  editListenCorrelationPercentage: number
  speakerChangePercentage: number
  speakerMacroF1Score: number
}
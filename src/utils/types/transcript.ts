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

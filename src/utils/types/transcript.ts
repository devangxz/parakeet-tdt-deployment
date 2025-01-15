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
    type: 'meta' | 'ctm' | 'edit';
    start: number;
    end: number;
    conf: number;
    punct: string;
    source: string;
    speaker: string;
    turn?: number;
    quillStart?: number;
    quillEnd?: number;
}

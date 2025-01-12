import { CTMType, AlignmentType } from '../types/transcript'

export function findMatchingBoundary(
    newWords: string[],
    alignments: AlignmentType[],
    endIdx: number
): number {
    // Search backwards from end to find last matching occurrence
    const lastTwoNew = newWords.slice(-2).join(' ');

    let searchIdx = Math.min(alignments.length - 1, endIdx + 1);
    while (searchIdx > 1) {
        const lastTwoOld = alignments.slice(searchIdx - 1, searchIdx + 1)
            .map(a => a.word)
            .join(' ');
        if (lastTwoOld === lastTwoNew) break;
        searchIdx--;
    }
    return searchIdx;
}

export function updatePartialAlignment(
    normalizedText: string,
    minOffset: number,
    maxOffset: number,
    alignments: AlignmentType[],
    processAlignmentUpdate: (newText: string, currentAlignments: AlignmentType[]) => AlignmentType[],
    characterIndexToWordIndex: (text: string, charIndex: number) => number
): AlignmentType[] {
    const newWords = normalizedText.split(/\s+/).filter(Boolean);
                    
    let startIndex = characterIndexToWordIndex(normalizedText, minOffset) - 2;
    if (startIndex < 0) startIndex = 0;
    
    let endIndex = characterIndexToWordIndex(normalizedText, maxOffset) + 2;
    if (endIndex >= newWords.length) {
        endIndex = newWords.length - 1;
    }

    // Start search near end position to find correct word boundary
    const oldEndIndex = findMatchingBoundary(
        newWords.slice(startIndex, endIndex + 1),
        alignments,
        endIndex
    );
                        
    const changedWords = newWords.slice(startIndex, endIndex + 1).join(' ');
    const affectedAlignments = alignments.slice(startIndex, oldEndIndex + 1);

    console.log('Changed Words:', changedWords);
    console.log('Affected Alignments:', affectedAlignments.map(a => a.word).join(' '));

    const updatedSlice = processAlignmentUpdate(changedWords, affectedAlignments);
    
    return [
        ...alignments.slice(0, startIndex),
        ...updatedSlice,
        ...alignments.slice(oldEndIndex + 1)
    ];
}

export function createAlignments(text: string, ctms: CTMType[]): AlignmentType[] {
    const words = text.split(/\s+/);
    const alignments: AlignmentType[] = [];
    let ctmIndex = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        if (ctmIndex < ctms.length && 
            (word.toLowerCase() === ctms[ctmIndex].word || 
             word === ctms[ctmIndex].punct)) {
            alignments.push({
                ...ctms[ctmIndex],
                word: word,
                type: 'ctm'
            });
            ctmIndex++;
        } else {
            const referenceCTM = ctmIndex < ctms.length ? ctms[ctmIndex] : ctms[ctms.length - 1];
            alignments.push({
                word: word,
                type: 'meta',
                start: referenceCTM.start,
                end: referenceCTM.end,
                conf: 1.0,
                punct: word,
                source: 'meta',
                speaker: referenceCTM.speaker,
                turn: referenceCTM.turn
            });
        }
    }

    return alignments;
}

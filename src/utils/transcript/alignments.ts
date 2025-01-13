import { CTMType, AlignmentType } from '../types/transcript'

export function findMatchingBoundary(
    newWords: string[],
    alignments: AlignmentType[],
    endIdx: number
): number {
    // Search backwards from end to find last matching occurrence
    const lastTwoNew = newWords.slice(-2).join(' ');
    console.log('Finding boundary match for:', lastTwoNew);

    let searchIdx = Math.min(alignments.length - 1, endIdx + 1);
    console.log('Starting search at index:', searchIdx);

    while (searchIdx > 1) {
        const lastTwoOld = alignments.slice(searchIdx - 1, searchIdx + 1)
            .map(a => a.word)
            .join(' ');
        console.log('Comparing with:', lastTwoOld, 'at index:', searchIdx);
        
        if (lastTwoOld === lastTwoNew) {
            console.log('Found matching boundary at index:', searchIdx);
            break;
        }
        searchIdx--;
    }

    console.log('Final boundary index:', searchIdx);
    return searchIdx;
}

export function updatePartialAlignment(
    text: string,
    minOffset: number,
    maxOffset: number,
    alignments: AlignmentType[],
    updateAlignments: (newText: string, currentAlignments: AlignmentType[]) => AlignmentType[],
    characterIndexToWordIndex: (text: string, charIndex: number) => number
): AlignmentType[] {
    const newWords = text.split(/\s+/).filter(Boolean);
                    
    let startIndex = characterIndexToWordIndex(text, minOffset) - 2;
    if (startIndex < 0) startIndex = 0;    
    console.log('start index:', startIndex);
    
    let endIndex = characterIndexToWordIndex(text, maxOffset) + 2;
    if (endIndex >= newWords.length) {
        endIndex = newWords.length - 1;
    }
    console.log("end index:", endIndex)

    // Start search near end position to find correct word boundary
    const oldEndIndex = findMatchingBoundary(
        newWords.slice(startIndex, endIndex + 1),
        alignments,
        endIndex + 2
    );
                        
    const changedWords = newWords.slice(startIndex, endIndex + 1).join(' ');
    const affectedAlignments = alignments.slice(startIndex, oldEndIndex + 1);

    console.log('Changed Words:', changedWords);
    console.log('Affected Alignments:', affectedAlignments.map(a => a.word).join(' '));

    const updatedSlice = updateAlignments(changedWords, affectedAlignments);
    
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

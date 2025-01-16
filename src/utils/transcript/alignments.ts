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

export function getAlignmentIndexByTime(alignments: AlignmentType[], time: number, lastIndex: number | null): number  {
    if (alignments.length === 0) return 0;

    // Find next non-meta index (includes current index)
    const findNextNonMeta = (index: number) => {
        while (index < alignments.length && alignments[index].type === 'meta') {
            index++;
        }
        return index < alignments.length ? index : null;
    };

    // Find previous non-meta index
    const findPrevNonMeta = (index: number) => {
        while (index >= 0 && alignments[index].type === 'meta') {
            index--;
        }
        return index >= 0 ? index : null;
    };
    
    // Sequential play optimization
    if (lastIndex !== null) {
        // If last index was meta, find next non-meta
        if (alignments[lastIndex].type === 'meta') {
            lastIndex = findNextNonMeta(lastIndex);
            if (lastIndex === null) return alignments.length - 1;
        }

        const lastWord = alignments[lastIndex];
        
        // Still in current word
        if (time >= lastWord.start && time < lastWord.end) {
            return lastIndex;
        }
        
        // Moving forward
        if (time >= lastWord.end) {
            const nextIndex = findNextNonMeta(lastIndex + 1);
            if (nextIndex !== null) {
                const nextWord = alignments[nextIndex];
                
                // In gap between words
                if (time < nextWord.start) {
                    const timeToLastEnd = time - lastWord.end;
                    const timeToNextStart = nextWord.start - time;
                    return timeToLastEnd < timeToNextStart ? lastIndex : nextIndex;
                }
                
                // Within next word
                if (time < nextWord.end) {
                    return nextIndex;
                }
            }
        } else {
            // Moving backward
            const prevIndex = findPrevNonMeta(lastIndex - 1);
            if (prevIndex !== null) {
                const prevWord = alignments[prevIndex];
                if (time >= prevWord.start && time < prevWord.end) {
                    return prevIndex;
                }
            }
        }
    }
    
    // Binary search
    let low = 0;
    let high = alignments.length - 1;
    
    while (low <= high) {
        const mid = (low + high) >> 1;
        // Skip meta entries in binary search
        const currentIndex = findNextNonMeta(mid);
        if (currentIndex === null) {
            high = mid - 1;
            continue;
        }
        
        const word = alignments[currentIndex];
        
        if (time >= word.start && time < word.end) {
            return currentIndex;
        }
        
        const prevIndex = findPrevNonMeta(currentIndex - 1);
        if (prevIndex !== null) {
            const prevWord = alignments[prevIndex];
            if (time >= prevWord.end && time < word.start) {
                const prevDistance = time - prevWord.end;
                const nextDistance = word.start - time;
                return prevDistance < nextDistance ? prevIndex : currentIndex;
            }
        }
        
        if (time < word.start) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    
    // Edge cases - find first/last non-meta entries
    const firstNonMetaIndex = findNextNonMeta(0);
    if (firstNonMetaIndex !== null && time < alignments[firstNonMetaIndex].start) {
        return firstNonMetaIndex;
    }
    
    const finalWordIndex = findPrevNonMeta(alignments.length - 1);
    if (finalWordIndex !== null) {
        return finalWordIndex;
    }
    
    return 0;
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

import { CTMType, AlignmentType } from '../types/transcript'
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT } from '@/utils/transcript/diff_match_patch';

export function processAlignmentUpdate(newText: string, currentAlignments: AlignmentType[]): AlignmentType[] {
    if (currentAlignments.length === 0) return [];

    // Convert alignments to text for diffing
    const oldText = currentAlignments.map(a => a.word).join(' ');
    
    // Use diff_match_patch in word mode
    const dmp = new diff_match_patch();
    const rawDiffs = dmp.diff_wordMode(oldText, newText);
    
    // Convert dmp output to match { type, value }
    const diffs = rawDiffs.map(([op, text]) => {
        if (op === DIFF_DELETE) {
            return { type: 'removed', value: text };
        } else if (op === DIFF_INSERT) {
            return { type: 'added', value: text };
        }
        return { type: 'unchanged', value: text };
    });
    
    // Create new alignments array
    const newAlignments: AlignmentType[] = [];
    let alignmentIndex = 0;
    let lastRemovedAlignment: AlignmentType | null = null;

    const isPunctuation = (word: string): boolean => {
        return /^[.,!?;:]$/.test(word);
    };
    
    diffs.forEach((part) => {
        console.log("Diff part:", part);
        
        if (part.type === 'removed') {
            // Store removed word info for potential replacement
            const removedWords = part.value.trim()
                .split(/\s+/)
                .filter(w => w.length > 0);
            lastRemovedAlignment = removedWords.length === 1 ? currentAlignments[alignmentIndex] : null;
            alignmentIndex += removedWords.length;
        } else if (part.type === 'added') {
            // Add new words
            const newWords = part.value.trim().split(/\s+/).filter(w => w.length > 0);
            
            // Check if this is a direct word replacement
            const isReplacement = lastRemovedAlignment && 
                newWords.length === 1;
            
            if (isReplacement) {
                // Use timing from the removed word
                newAlignments.push({
                    word: newWords[0],
                    type: 'edit',
                    start: lastRemovedAlignment!.start,
                    end: lastRemovedAlignment!.end,
                    conf: 1.0,
                    punct: newWords[0],
                    source: 'user',
                    speaker: lastRemovedAlignment!.speaker,
                    turn: lastRemovedAlignment!.turn
                });
            } else {
                // Handle as new insertion
                const prevAlignment = alignmentIndex > 0 ? currentAlignments[alignmentIndex - 1] : null;
                const nextAlignment = currentAlignments[alignmentIndex] || currentAlignments[currentAlignments.length - 1];
                
                newWords.forEach((word, idx) => {
                    if (isPunctuation(word)) {
                        // For punctuation, create meta alignment with same start/end time
                        const start = prevAlignment ? prevAlignment.end : (nextAlignment ? nextAlignment.start : 0);
                        
                        newAlignments.push({
                            word,
                            type: 'meta', // Set type as meta for punctuation
                            start: start,
                            end: start, // Same as start for punctuation
                            conf: 1.0,
                            punct: word,
                            source: 'user',
                            speaker: nextAlignment.speaker,
                            turn: nextAlignment.turn
                        });
                    } else {
                        // Regular word - interpolate timing with 10ms gaps
                        let start, end;
                        if (!prevAlignment) {
                            // At the start - use next word timing minus gap
                            start = nextAlignment.start - ((newWords.length - idx) * 0.01);
                            end = start + 0.01;
                        } else if (!nextAlignment) {
                            // At the end - use previous word timing plus gap
                            start = prevAlignment.end + (idx * 0.01);
                            end = start + 0.01;
                        } else {
                            // In between words - interpolate with gaps
                            const timeGap = nextAlignment.start - prevAlignment.end;
                            const wordDuration = timeGap / (newWords.length + 1);
                            start = prevAlignment.end + (wordDuration * (idx + 1));
                            end = start + 0.01;
                        }

                        newAlignments.push({
                            word,
                            type: 'edit',
                            start,
                            end,
                            conf: 1.0,
                            punct: word,
                            source: 'user',
                            speaker: nextAlignment.speaker,
                            turn: nextAlignment.turn
                        });
                    }
                });
            }
            lastRemovedAlignment = null;
        } else {
            // Keep unchanged words
            const unchangedWords = part.value.trim().split(/\s+/).filter(w => w.length > 0);
            unchangedWords.forEach(() => {
                newAlignments.push(currentAlignments[alignmentIndex]);
                alignmentIndex++;
            });
        }
    });
    
    return newAlignments;
}

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

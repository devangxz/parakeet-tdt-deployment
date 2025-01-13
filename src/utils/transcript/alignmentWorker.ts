import { AlignmentType } from '../types/transcript'
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT } from '@/utils/transcript/diff_match_patch'

function processMetaPhrase(text: string): string[] {
    text = text.trim();
    
    if (/^\d:\d{2}:\d{2}\.\d$/.test(text) || /^S\d+:$/.test(text)) {
        return [text];
    }
    
    if (text.startsWith('[') && text.endsWith(']')) {
        const words = text.slice(1, -1).split(/\s+/);
        if (words.length === 1) {
            return [`[${words[0]}]`];
        }
        return [
            `[${words[0]}`,
            ...words.slice(1, -1),
            `${words[words.length - 1]}]`
        ];
    }
    
    return text.split(/\s+/);
}

const isPunctuation = (word: string): boolean => {
    return /^[.,!?;:]$/.test(word);
};

const isMetaContent = (word: string): boolean => {
    return (
        /^\d:\d{2}:\d{2}\.\d$/.test(word) ||  // Timestamp
        /^S\d+:$/.test(word) ||               // Speaker label
        /^\[.*\]$/.test(word) ||              // Single bracketed word
        word.startsWith('[') ||               // Start of bracketed phrase
        word.endsWith(']')                    // End of bracketed phrase
    );
};

function updateAlignments(newText: string, currentAlignments: AlignmentType[]): AlignmentType[] {
    if (currentAlignments.length === 0) return [];

    const oldText = currentAlignments.map(a => a.word).join(' ');
    const cleanText = (text: string) => text.replace(/\s*\n+\s*/g, ' ').trim();
    
    const dmp = new diff_match_patch();
    const rawDiffs = dmp.diff_wordMode(cleanText(oldText), cleanText(newText));
    
    const diffs = rawDiffs.map(([op, text]) => {
        if (op === DIFF_DELETE) {
            return { type: 'removed', value: text };
        } else if (op === DIFF_INSERT) {
            return { type: 'added', value: text };
        }
        return { type: 'unchanged', value: text };
    });
    
    const newAlignments: AlignmentType[] = [];
    let alignmentIndex = 0;
    let lastRemovedAlignment: AlignmentType | null = null;
    
    diffs.forEach((part) => {
        if (part.type === 'removed') {
            const removedWords = part.value.trim()
                .match(/\[.*?\]|\S+/g)
                ?.reduce((words: string[], segment) => {
                    return [...words, ...processMetaPhrase(segment)];
                }, []) || [];
            lastRemovedAlignment = removedWords.length === 1 ? currentAlignments[alignmentIndex] : null;
            alignmentIndex += removedWords.length;
        } else if (part.type === 'added') {
            const newWords = part.value.trim()
                .match(/\[.*?\]|\S+/g)
                ?.reduce((words: string[], segment) => {
                    return [...words, ...processMetaPhrase(segment)];
                }, []) || [];
            
            const isReplacement = lastRemovedAlignment && newWords.length === 1;
            
            if (isReplacement) {
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
                const prevAlignment = alignmentIndex > 0 ? currentAlignments[alignmentIndex - 1] : null;
                const nextAlignment = currentAlignments[alignmentIndex] || currentAlignments[currentAlignments.length - 1];
                
                newWords.forEach((word, idx) => {
                    if (isMetaContent(word) || isPunctuation(word)) {
                        const start = prevAlignment ? prevAlignment.end : (nextAlignment ? nextAlignment.start : 0);
                        
                        newAlignments.push({
                            word,
                            type: 'meta',
                            start: start,
                            end: start,
                            conf: 1.0,
                            punct: word,
                            source: 'meta',
                            speaker: nextAlignment.speaker,
                            turn: nextAlignment.turn
                        });
                    } else {
                        let start, end;
                        if (!prevAlignment) {
                            start = nextAlignment.start - ((newWords.length - idx) * 0.01);
                            end = start + 0.01;
                        } else if (!nextAlignment) {
                            start = prevAlignment.end + (idx * 0.01);
                            end = start + 0.01;
                        } else {
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
            const unchangedWords = part.value.trim()
                .match(/\[.*?\]|\S+/g)
                ?.reduce((words: string[], segment) => {
                    return [...words, ...processMetaPhrase(segment)];
                }, []) || [];
            
            unchangedWords.forEach(() => {
                newAlignments.push(currentAlignments[alignmentIndex]);
                alignmentIndex++;
            });
        }
    });
    
    return newAlignments;
}

self.onmessage = (e: MessageEvent) => {
    const { newText, currentAlignments } = e.data;
    const updatedAlignments = updateAlignments(newText, currentAlignments);
    self.postMessage(updatedAlignments);
};
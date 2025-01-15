import { diff_match_patch, DIFF_DELETE, DIFF_INSERT } from '@/utils/transcript/diff_match_patch'
import { AlignmentType } from '@/utils/types/transcript'

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

const isPunctuation = (word: string) => /^[.,!?;:]$/.test(word);

const isMetaContent = (word: string) => (
    /^\d:\d{2}:\d{2}\.\d$/.test(word) ||  // Timestamp
    /^S\d+:$/.test(word) ||              // Speaker label
    /^\[.*\]$/.test(word) ||             // Single bracketed word
    word.startsWith('[') ||              // Start of bracketed phrase
    word.endsWith(']')                   // End of bracketed phrase
);

/**
 * Returns an array of { word, startPos, endPos } for the given text,
 * ignoring extra spaces/newlines.
 *
 * Example: "Hello   world\n\nThis is   new" ->
 * [
 *   { word: "Hello", startPos: 0, endPos: 5 },
 *   { word: "world", startPos: 8, endPos: 13 },
 *   ...
 * ]
 */
function tokenizeWithOffsets(rawText: string) {
    const tokens = [];
    // Use a regex that captures sequences of non-whitespace plus bracketed phrases
    const regex = /\[.*?\]|\S+/g;
    let match;
    
    while ((match = regex.exec(rawText)) !== null) {
        const word = match[0];
        // `match.index` is exactly where this token starts in rawText
        const startPos = match.index;
        const endPos = startPos + word.length; // not inclusive
        
        tokens.push({ word, startPos, endPos });
    }
    return tokens;
}

/**
 * This updates (or re-generates) alignments given a new text input.
 */
function updateAlignments(newText: string, currentAlignments: AlignmentType[]) {
    if (!currentAlignments.length) return [];

    // Build word array + positions from the new text
    const newTokens = tokenizeWithOffsets(newText);
    const newWords = newTokens.map(t => t.word);
    // For diffing, join by space so we match the old approach
    const newJoined = newWords.join(' ');

    // Old text is the alignment's words joined by space
    const oldWords = currentAlignments.map(a => a.word);
    const oldJoined = oldWords.join(' ');

    // Perform the diff
    const dmp = new diff_match_patch();
    const rawDiffs = dmp.diff_wordMode(oldJoined, newJoined);  
    const diffs = rawDiffs.map(([op, text]) => {
        if (op === DIFF_DELETE) return { type: 'removed', value: text };
        if (op === DIFF_INSERT) return { type: 'added',   value: text };
        return { type: 'unchanged', value: text };
    });

    // Reconstruct new Alignments
    const newAlignments: AlignmentType[] = [];
    let alignmentIndex = 0;       // old alignment pointer
    let newTokenIndex = 0;        // newTokens pointer
    let lastRemovedAlignment: AlignmentType | null = null;

    diffs.forEach(part => {
        const { type, value } = part;

        /**
         * Break the diff "value" into words (accounting for bracketed phrases) again
         * so we know how many tokens to skip forward.
         */
        const segmentWords = value.trim()
            ? value.trim().match(/\[.*?\]|\S+/g)?.reduce<string[]>((words, segment) => [...words, ...processMetaPhrase(segment)], []) || []
            : [];

        if (type === 'removed') {
            // Mark the removed words in old alignments
            lastRemovedAlignment =
                segmentWords.length === 1 ? currentAlignments[alignmentIndex] : null;
            alignmentIndex += segmentWords.length;
        } else if (type === 'added') {
            const isReplacement =
                lastRemovedAlignment && segmentWords.length === 1;

            if (isReplacement) {
                // Replacement: keep the old alignment's timing but new text
                // Also update its new char offsets
                const { startPos, endPos } = newTokens[newTokenIndex];
                const replaced: AlignmentType = {
                    ...lastRemovedAlignment!,
                    word: segmentWords[0],
                    punct: segmentWords[0],
                    source: 'user',
                    type: 'edit',
                    start: lastRemovedAlignment!.start,
                    end: lastRemovedAlignment!.end,
                    conf: lastRemovedAlignment!.conf,
                    speaker: lastRemovedAlignment!.speaker,
                    quillStart: startPos,
                    quillEnd: endPos
                };                
                newAlignments.push(replaced);
                newTokenIndex++;
            } else {
                // Inserted words
                const prevAlignment = alignmentIndex > 0
                    ? currentAlignments[alignmentIndex - 1]
                    : null;
                const nextAlignment = currentAlignments[alignmentIndex]
                    || currentAlignments[currentAlignments.length - 1];

                segmentWords.forEach((word: string, idx: number) => {
                    // Insert meta or punctuation
                    if (isMetaContent(word) || isPunctuation(word)) {
                        const startTime = prevAlignment
                            ? prevAlignment.end
                            : nextAlignment
                            ? nextAlignment.start
                            : 0;

                        const { startPos, endPos } = newTokens[newTokenIndex];
                        newAlignments.push({
                            word,
                            type: 'meta',
                            start: startTime,
                            end: startTime,
                            conf: 1.0,
                            punct: word,
                            source: 'meta',
                            speaker: nextAlignment.speaker,
                            turn: nextAlignment.turn,
                            quillStart: startPos,
                            quillEnd: endPos
                        });
                        newTokenIndex++;
                    } else {
                        // Insert a brand-new word with approximate time
                        const { startPos, endPos } = newTokens[newTokenIndex];
                        newTokenIndex++;

                        let start, end;
                        if (!prevAlignment) {
                            start = nextAlignment.start - ((segmentWords.length - idx) * 0.01);
                            end   = start + 0.01;
                        } else if (!nextAlignment) {
                            start = prevAlignment.end + (idx * 0.01);
                            end   = start + 0.01;
                        } else {
                            const timeGap = nextAlignment.start - prevAlignment.end;
                            const wordDuration = timeGap / (segmentWords.length + 1);
                            start = prevAlignment.end + (wordDuration * (idx + 1));
                            end   = start + 0.01;
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
                            turn: nextAlignment.turn,
                            quillStart: startPos,
                            quillEnd: endPos
                        });
                    }
                });
            }
            lastRemovedAlignment = null;
        } else {
            // Unchanged
            segmentWords.forEach(() => {
                const oldAl = currentAlignments[alignmentIndex];
                alignmentIndex++;

                // This old alignment's word now corresponds to newTokens[newTokenIndex]
                const { startPos, endPos } = newTokens[newTokenIndex];
                newTokenIndex++;

                newAlignments.push({
                    ...oldAl,
                    quillStart: startPos,
                    quillEnd: endPos
                });
            });
        }
    });

    return newAlignments;
}

self.onmessage = (e) => {
    const { newText, currentAlignments } = e.data;
    const updatedAlignments = updateAlignments(newText, currentAlignments);
    self.postMessage(updatedAlignments);
};

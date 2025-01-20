import { diff_match_patch, DIFF_DELETE, DIFF_INSERT } from '@/utils/transcript/diff_match_patch'
import { AlignmentType, CTMType } from '@/utils/types/transcript'

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
  let currentPos = 0;
  
  // Match either:
  // - Complete meta phrase [...] to be split later
  // - Single non-whitespace characters
  const segments = rawText.match(/\[([^\]]*)\]|\S+/g) || [];
  
  for (const segment of segments) {
      // Skip whitespace
      while (currentPos < rawText.length && /\s/.test(rawText[currentPos])) {
          currentPos++;
      }
      
      // For meta phrases, split into multiple tokens
      if (segment.startsWith('[') && segment.endsWith(']')) {
          const words = segment.slice(1, -1).split(/\s+/);
          const startBracketPos = currentPos;
          
          // First word with opening bracket
          tokens.push({
              word: `[${words[0]}`,
              startPos: startBracketPos,
              endPos: startBracketPos + words[0].length + 1
          });
          
          // Middle words (if any)
          let wordPos = startBracketPos + words[0].length + 1;
          for (let i = 1; i < words.length - 1; i++) {
              wordPos++; // Skip space
              tokens.push({
                  word: words[i],
                  startPos: wordPos,
                  endPos: wordPos + words[i].length
              });
              wordPos += words[i].length;
          }
          
          // Last word with closing bracket
          if (words.length > 1) {
              wordPos++; // Skip space
              tokens.push({
                  word: `${words[words.length - 1]}]`,
                  startPos: wordPos,
                  endPos: wordPos + words[words.length - 1].length + 1
              });
          }
          
          currentPos = startBracketPos + segment.length;
          continue;
      }
      
      // Normal word
      tokens.push({
          word: segment,
          startPos: currentPos,
          endPos: currentPos + segment.length
      });
      currentPos += segment.length;
  }
  return tokens;
}

function markExactMatches(alignments: AlignmentType[], ctms: CTMType[]) {
    let ctmIndex = 0;
    let alignIndex = 0;

    while (ctmIndex < ctms.length && alignIndex < alignments.length) {
        const ctm = ctms[ctmIndex];
        const alignment = alignments[alignIndex];

        // Skip meta
        if (alignment.type !== 'ctm') {
            alignIndex++;
            continue;
        }

        // Exact matching by start/end
        if (ctm.start === alignment.start && ctm.end === alignment.end) {
            alignments[alignIndex] = {
                ...alignment,
                ctmIndex,
                case: ctm.word.toLowerCase() === alignment.word.toLowerCase() ? 'success' : 'mismatch'
            };
            ctmIndex++;
            alignIndex++;
        } else if (alignment.start < ctm.start) {
            // No match found for this alignment
            alignments[alignIndex] = {
                ...alignment,
                ctmIndex: -1,
                case: 'mismatch'
            };
            alignIndex++;
        } else {
            ctmIndex++;
        }
    }

    // Mark remaining alignments as mismatches
    while (alignIndex < alignments.length) {
        const alignment = alignments[alignIndex];
        if (alignment.type === 'ctm') {
            alignments[alignIndex] = {
                ...alignment,
                ctmIndex: -1,
                case: 'mismatch'
            };
        }
        alignIndex++;
    }

    return alignments;
}

function calculateWER(alignments: AlignmentType[], ctms: CTMType[]) {
  const ctmWords = ctms.length;
  const stats = alignments.reduce((acc, al) => {
    if (al.type === 'ctm') {
      acc.total++;
      acc.success += al.case === 'success' ? 1 : 0;
    }
    return acc;
  }, { total: 0, success: 0 });

  // Errors = substitutions + insertions + deletions
  const errors = (stats.total - stats.success) + (ctmWords - stats.success);
  const wer = errors / ctmWords;

  return wer;
}

/**
 * This updates (or re-generates) alignments given a new text input.
 */
function updateAlignments(newText: string, currentAlignments: AlignmentType[], ctms: CTMType[]) {
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
                    type: 'ctm',
                    start: lastRemovedAlignment!.start,
                    end: lastRemovedAlignment!.end,
                    conf: lastRemovedAlignment!.conf,
                    speaker: lastRemovedAlignment!.speaker,
                    startPos: startPos,
                    endPos: endPos
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
                        // Find next non-meta alignment's start time
                        let nextStartTime = nextAlignment?.start;
                        for (let i = alignmentIndex; i < currentAlignments.length; i++) {
                            const align = currentAlignments[i];
                            if (align.type !== 'meta') {
                                nextStartTime = align.start;
                                break;
                            }
                        }

                        const { startPos, endPos } = newTokens[newTokenIndex];
                        newAlignments.push({
                            word,
                            type: 'meta', 
                            start: nextStartTime || 0,
                            end: nextStartTime || 0,
                            conf: 1.0,
                            punct: word,
                            source: 'meta',
                            speaker: nextAlignment.speaker,
                            turn: nextAlignment.turn,
                            startPos: startPos,
                            endPos: endPos
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
                            type: 'ctm',
                            start: Number(start.toFixed(3)),
                            end: Number(end.toFixed(3)), 
                            conf: 1.0,
                            punct: word,
                            source: 'user',
                            speaker: nextAlignment.speaker,
                            turn: nextAlignment.turn,
                            startPos: startPos,
                            endPos: endPos
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
                    startPos: startPos,
                    endPos: endPos
                });
            });
        }
    });

    return markExactMatches(newAlignments, ctms);
}

self.onmessage = (e) => {
    const { newText, currentAlignments, ctms } = e.data;
    const updatedAlignments = updateAlignments(newText, currentAlignments, ctms);
    const wer = calculateWER(updatedAlignments, ctms);
    self.postMessage({ alignments: updatedAlignments, wer: Number(wer.toFixed(2)) });
};

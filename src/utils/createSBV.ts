import { secondsToTs } from "./getFormattedTranscript";
import { CTMSWord } from "@/components/editor/transcriptUtils";

interface CTMSWordWithCase extends CTMSWord {
    case?: 'success' | 'mismatch';
}

function createSBV(alignments: CTMSWordWithCase[]): string {
    try {
        let sbv = "";
        let line: string[] = [];

        for (let i = 0; i < alignments.length; i++) {
            const current = alignments[i];
            const word = current.word;
            const currentCase = current.case ?? 'success';
            const nextAlignment = i + 1 < alignments.length ? alignments[i + 1] : undefined;

            line.push(word);

            // If there's no next alignment, write what we have and return
            if (!nextAlignment && line.length > 0) {
                sbv += `${secondsToTs(alignments[i - line.length + 1].start)},${secondsToTs(current.end)}\n`;
                sbv += `${line.join(' ').trim()}\n\n`;
                return sbv;
            }

            let forceBreak = false;
            forceBreak = line.length > 10 && !(/\w/).test(word[word.length - 1]) && currentCase === 'success';

            // Ensure nextAlignment is defined before using it
            const shouldBreakOnGap = nextAlignment !== undefined &&
                line.length > 7 &&
                currentCase === 'success' &&
                (nextAlignment.case ?? 'success') === 'success' &&
                nextAlignment.start - current.end > 0.5;

            forceBreak = forceBreak || shouldBreakOnGap;
            forceBreak = forceBreak || (line.length > 12 && currentCase === 'success');
            forceBreak = forceBreak || line.join(' ').length > 70;

            if (forceBreak) {
                sbv += `${secondsToTs(alignments[i - line.length + 1].start)},${secondsToTs(current.end)}\n`;
                sbv += `${line.join(' ').trim()}\n\n`;
                line = [];
            }
        }

        // Handle any remaining content
        if (line.length > 0) {
            const startIndex = alignments.length - line.length;
            const endIndex = alignments.length - 1;
            sbv += `${secondsToTs(alignments[startIndex].start)},${secondsToTs(alignments[endIndex].end)}\n`;
            sbv += line.join(' ').trim();
        }

        return sbv;
    } catch (error) {
        console.error('Error creating SBV:', error);
        throw error;
    }
}

export { createSBV };

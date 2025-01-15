import { secondsToTs } from "./secondsToTs";
import { AlignmentType } from "@/utils/transcript";

function createSBV(alignments: AlignmentType[]): string {
    try {
        let sbv = "";
        let line: string[] = [];

        for (let i = 0; i < alignments.length; i++) {
            const current = alignments[i];
            const word = current.word;
            const currentCase = current.type ?? 'ctm';
            const nextAlignment = i + 1 < alignments.length ? alignments[i + 1] : undefined;

            line.push(word);

            // If there's no next alignment, write what we have and return
            if (!nextAlignment && line.length > 0) {
                sbv += `${secondsToTs(alignments[i - line.length + 1].start)},${secondsToTs(current.end)}\n`;
                sbv += `${line.join(' ').trim()}\n\n`;
                return sbv;
            }

            let forceBreak = false;
            forceBreak = line.length > 10 && !(/\w/).test(word[word.length - 1]) && currentCase === 'ctm';

            // Ensure nextAlignment is defined before using it
            const shouldBreakOnGap = nextAlignment !== undefined &&
                line.length > 7 &&
                currentCase === 'ctm' &&
                (nextAlignment.type ?? 'ctm') === 'ctm' &&
                nextAlignment.start - current.end > 0.5;

            forceBreak = forceBreak || shouldBreakOnGap;
            forceBreak = forceBreak || (line.length > 12 && currentCase === 'ctm');
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

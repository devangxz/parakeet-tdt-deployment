import { secondsToTs } from "./getFormattedTranscript";
import { CTMSWord } from "@/components/editor/transcriptUtils";

interface CTMSWordWithCase extends CTMSWord {
    case?: 'success' | 'mismatch';
}

interface SubtitleOutput {
    srt: string;
    vtt: string;
}

export default function getSRTVTT(alignments: CTMSWordWithCase[]): SubtitleOutput | null {
    try {
        // Validate input
        if (!alignments?.length) {
            console.error('Empty alignments provided');
            return null;
        }

        let srt = '';
        let vtt = 'WEBVTT\r\n\r\n';
        let line: string[] = [];
        let paraCount = 0;

        for (let i = 0; i < alignments.length; i++) {
            const current = alignments[i];
            const word = current.word;
            const currentCase = current.case ?? 'success';
            const nextAlignment = i + 1 < alignments.length ? alignments[i + 1] : undefined;

            line.push(word);

            // If there's no next alignment, write what we have and return
            if (!nextAlignment && line.length > 0) {
                const startTs = alignments[i - line.length + 1].start;
                const endTs = current.end;
                const srtTimestamp = `00:${secondsToTs(startTs).replace('.', ',')} --> 00:${secondsToTs(endTs).replace('.', ',')}`;
                const vttTimestamp = `00:${secondsToTs(startTs)} --> 00:${secondsToTs(endTs)}`;

                paraCount++;
                srt += `${paraCount}\r\n${srtTimestamp}\r\n${line.join(' ').trim()}\r\n\r\n`;
                vtt += `${vttTimestamp}\r\n${line.join(' ').trim()}\r\n\r\n`;
                break;
            }

            let forceBreak = false;
            forceBreak = line.length > 10 && !(/\w/).test(word[word.length - 1]) && currentCase === 'success';

            const shouldBreakOnGap = nextAlignment !== undefined &&
                line.length > 7 &&
                currentCase === 'success' &&
                (nextAlignment.case ?? 'success') === 'success' &&
                nextAlignment.start - current.end > 0.5;

            forceBreak = forceBreak || shouldBreakOnGap;
            forceBreak = forceBreak || (line.length > 12 && currentCase === 'success');
            forceBreak = forceBreak || line.join(' ').length > 70;

            if (forceBreak) {
                const startTs = alignments[i - line.length + 1].start;
                const endTs = current.end;
                const srtTimestamp = `00:${secondsToTs(startTs).replace('.', ',')} --> 00:${secondsToTs(endTs).replace('.', ',')}`;
                const vttTimestamp = `00:${secondsToTs(startTs)} --> 00:${secondsToTs(endTs)}`;

                paraCount++;
                srt += `${paraCount}\r\n${srtTimestamp}\r\n${line.join(' ').trim()}\r\n\r\n`;
                vtt += `${vttTimestamp}\r\n${line.join(' ').trim()}\r\n\r\n`;
                line = [];
            }
        }

        // Handle any remaining content
        if (line.length > 0) {
            const startIndex = alignments.length - line.length;
            const endIndex = alignments.length - 1;
            const startTs = alignments[startIndex].start;
            const endTs = alignments[endIndex].end;
            const srtTimestamp = `00:${secondsToTs(startTs).replace('.', ',')} --> 00:${secondsToTs(endTs).replace('.', ',')}`;
            const vttTimestamp = `00:${secondsToTs(startTs)} --> 00:${secondsToTs(endTs)}`;

            paraCount++;
            srt += `${paraCount}\r\n${srtTimestamp}\r\n${line.join(' ').trim()}\r\n`;
            vtt += `${vttTimestamp}\r\n${line.join(' ').trim()}\r\n`;
        }

        return {
            srt,
            vtt
        };
    } catch (error) {
        console.error('Error generating subtitles:', error);
        return null;
    }
}
import { secondsToTs } from '../secondsToTs'
import { CTMType } from '@/types/editor'

export function getFormattedTranscript(ctms: CTMType[]): string {
    const paragraphs: string[] = [];
    let currentWords: [number, string][] = [];

    ctms.forEach((ctm, index) => {
        const word = ctm.punct ?? ctm.word;
        currentWords.push([index, word]);

        const isEndOfSentence = currentWords.length > 200 && /[.!?]$/.test(word);
        const isLastWord = index === ctms.length - 1;
        const isSpeakerTurn = 'turn' in ctm;

        if (isSpeakerTurn || isLastWord || isEndOfSentence) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            let sentence = currentWords.map(([_, w]) => w).join(' ');
            const startCtm = ctms[currentWords[0][0]];

            if (startCtm.speaker) {
                sentence = `${secondsToTs(startCtm.start, true)} ${startCtm.speaker}: ${sentence}`;
            }

            paragraphs.push(sentence);
            currentWords = [];
        }
    });

    const transcript = paragraphs.join('\n\n');
    return applyTextReplacements(transcript);
}

function applyTextReplacements(transcript: string): string {
    const text = transcript
        .replace(/(\d+) percent/g, '$1 %')
        .replace(/(\d+) dollars?/g, '$ $1');

    const capitalize = (match: string, letter: string) => match[0] + ' ' + letter.toUpperCase();
    const capitalizeAfterEllipsis = (match: string) => '... ' + match[1].toUpperCase();

    return text
        .replace(/[.:?!] ([a-z])/g, capitalize)
        .replace(/,$/gm, '.')
        .replace(/\.\.\. ([a-z])/g, capitalizeAfterEllipsis);
}

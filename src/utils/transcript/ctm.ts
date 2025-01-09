import { TranscriptWord } from "assemblyai";

import { CTMType } from '../types/transcript'

export function getCTMs(transcriptWords: TranscriptWord[]): CTMType[] {
    const ctms: CTMType[] = [];
    
    transcriptWords.forEach((word, index) => {
        const startInSeconds = word.start / 1000;
        const endInSeconds = word.end / 1000;

        if (!word.speaker) throw new Error('Speaker not found');
        const speakerNumber = word.speaker.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
        const speaker = `S${speakerNumber}`;

        const ctm: CTMType = {
            start: parseFloat(startInSeconds.toFixed(3)),
            end: parseFloat(endInSeconds.toFixed(3)),
            word: word.text.toLowerCase().replace(/[^\w\s]/g, ''),
            conf: parseFloat(word.confidence.toFixed(2)),
            punct: word.text,
            source: 'assembly_ai',
            speaker: speaker,
        };

        if (index > 0 && word.speaker !== transcriptWords[index - 1].speaker) {
            ctms[index - 1].turn = 1;
        }

        ctms.push(ctm);
    });

    return ctms;
}

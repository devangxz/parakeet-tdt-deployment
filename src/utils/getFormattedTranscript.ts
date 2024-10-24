import { TranscriptWord } from "assemblyai";

export type ConvertedASROutput = {
    start: number;
    duration: number;
    end: number;
    word: string;
    conf: number;
    chars: string;
    punct: string;
    source: string;
    turn_prob: number;
    index: number;
    speaker: string;
    turn?: number;
};

const secondsToTs = (sec: number, show_hours: boolean = false, decimal_points: number = 1): string => {
    const h = Math.floor(sec / 3600);
    let m = Math.floor((sec % 3600) / 60);
    let s = parseFloat((sec % 60).toFixed(decimal_points));
    if (s >= 60) {
        s = 0;
        m += 1;
    }
    let t = "";
    if (show_hours || sec >= 3600) {
        t = `${h}:`;
    }
    t += `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s.toFixed(decimal_points) : s.toFixed(decimal_points)}`;
    return t;
};

export function convertASRArray(asrArray: TranscriptWord[]): ConvertedASROutput[] {
    const newAsrArray: ConvertedASROutput[] = [];
    asrArray.forEach((asrOutput, index) => {
        // Convert milliseconds to seconds
        const startInSeconds = asrOutput.start / 1000;
        const endInSeconds = asrOutput.end / 1000;

        // Calculate duration
        const duration = endInSeconds - startInSeconds;

        // Map speaker from A to S1, S2, S3, ...
        const speakerMap: { [key: string]: string } = { A: 'S1', B: 'S2', C: 'S3', D: 'S4', E: 'S5', F: 'S6', G: 'S7', H: 'S8', I: 'S9', J: 'S10', K: 'S11' };
        if (!asrOutput.speaker) throw new Error('Speaker not found');
        const speaker = speakerMap[asrOutput.speaker] || asrOutput.speaker;

        // Create the desired output object
        const convertedOutput: ConvertedASROutput = {
            start: parseFloat(startInSeconds.toFixed(2)),
            duration: parseFloat(duration.toFixed(2)),
            end: parseFloat(endInSeconds.toFixed(2)),
            word: asrOutput.text.toLowerCase(),
            conf: parseFloat(asrOutput.confidence.toFixed(2)),
            chars: asrOutput.text.toLowerCase(),
            punct: asrOutput.text,
            source: 'assembly_ai',
            turn_prob: 0.5,
            index: index,
            speaker: speaker,
        };
        if (asrArray[index - 1] && asrOutput.speaker !== asrArray[index - 1].speaker) {
            newAsrArray[index - 1].turn = 1;
        }

        newAsrArray.push(convertedOutput);
    });

    return newAsrArray;
}

function getDiarizedTranscript(ctms: ConvertedASROutput[], punctuatedTurns = false) {

    const paras = [];
    let words = [];

    for (let i = 0; i < ctms.length; i++) {
        const c = ctms[i];
        const word: string = c['punct'] !== undefined ? c['punct'] : c['word'];
        words.push([i, word]);

        if ('turn' in c || i === ctms.length - 1 || (words.length > 200 && typeof word === 'string' && word.includes('.'))) {
            let sent = words.map(w => w[1]).join(' ');
            sent = sent.replace(/- /g, '-');
            const startCtmIndex: number = words[0][0] as number;
            const startCtm = ctms[startCtmIndex];

            if ('speaker' in startCtm) {
                sent = secondsToTs(startCtm['start'], true) + ' ' + startCtm['speaker'] + ': ' + sent;
            }

            paras.push(sent);
            words = [];
        }
    }

    let tr = paras.join('\n\n');
    tr = tr.replace(/(\d+) percent/g, '$1%');
    tr = tr.replace(/(\d+) dollars?/g, '$$1');

    function uppercase(match: string) {
        return match[0].toUpperCase();
    }

    function uppercaseEllipsis(match: string) {
        return '... ' + match[1].toUpperCase();
    }

    tr = tr.replace(/[.:?!] ([a-z])/g, uppercase);
    tr = tr.replace(/,$/gm, '.');
    tr = tr.replace(/\.\.\.(\w)/g, '... $1');
    tr = tr.replace(/\.\.\. ([a-z])/g, uppercaseEllipsis);

    if (punctuatedTurns) {
        tr = tr.replace(/([a-zA-Z0-9,]+)\n\n/g, '$1 ');
        tr = tr.replace(/\n\n([a-z])/g, uppercase);
    }

    return tr;
}

export default function getFormattedTranscript(ctms: TranscriptWord[]) {
    return getDiarizedTranscript(convertASRArray(ctms));
}
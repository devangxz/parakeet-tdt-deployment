import { CTMType, AlignmentType } from '../types/transcript'

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

import prisma from '@/lib/prisma'

export function removeTimestamps(transcript: string): string {
    return transcript.replace(/^\d{1,2}:[0-5][0-9]:[0-5][0-9]\.\d\s/gm, '');
}

function removeSpeakerNames(transcript: string): string {
    return transcript.replace(/(\d+:\d+:\d+\.\d+)\s+[^:]+:/g, '$1:');
}

function removeSpeakerNamesAndTimestamps(transcript: string): string {
    return transcript.replace(/^\d+:[0-5][0-9]:[0-5][0-9]\.\d+\s+[^\:]+:\s/gm, '');
}

export function getTranscriptWithSpeakers(transcript: string, speakers: { fn: string; ln: string; }[]): string {
    const speakerMap = new Map();
    speakers.forEach((speaker, index) => {
        speakerMap.set(`S${index + 1}`, `${speaker.fn} ${speaker.ln}`);
    });

    return transcript.replace(/(\d+:\d+:\d+\.\d+)\s+(S\d+):/g, (match, timestamp, speakerCode) => {
        const fullName = speakerMap.get(speakerCode);
        if (!fullName) return match; // If no mapping found, return original
        return `${timestamp} ${fullName}:`;
    });
}

const getCustomerTranscript = async (fileId: string, transcript: string) => {

    const invoiceFile = await prisma.invoiceFile.findFirst({
        where: { fileId: fileId },
        select: {
            invoiceId: true,
        },
    })

    const invoice = await prisma.invoice.findUnique({
        where: { invoiceId: invoiceFile?.invoiceId },
        select: {
            options: true
        },
    });

    if (!invoice) {
        throw new Error(`No invoice found for fileId: ${fileId}`);
    }

    const options = JSON.parse(invoice.options ?? '{}');

    let customerTranscript = transcript;

    const speakers: { fn: string, ln: string }[] = options.sn ? options.sn[fileId] : [];

    // sif => speaker tracking
    // si => (0 = initial, 1 = full name)
    // ts => timestamps

    if (!options.ts && !options.sif) {
        customerTranscript = removeSpeakerNamesAndTimestamps(customerTranscript);
    }
    if (options.sif) {
        if (!options.si) {
            const speakerMap = new Map();
            speakers.forEach((speaker, index) => {
                speakerMap.set(`S${index + 1}`, {
                    fullName: `${speaker.fn} ${speaker.ln}`,
                    initials: `${speaker.fn.charAt(0)}${speaker.ln.charAt(0)}`
                });
            });

            const seenSpeakers = new Set();
            customerTranscript = customerTranscript.replace(/(\d+:\d+:\d+\.\d+)\s+(S\d+):/g, (match, timestamp, speakerCode) => {
                const speaker = speakerMap.get(speakerCode);
                if (!speaker) return match; // If no mapping found, return original

                if (seenSpeakers.has(speakerCode)) {
                    return `${timestamp} ${speaker.initials}:`;
                } else {
                    seenSpeakers.add(speakerCode);
                    return `${timestamp} ${speaker.fullName}:`;
                }
            });
        } else {
            customerTranscript = getTranscriptWithSpeakers(customerTranscript, speakers);
        }
    }

    if (!options.sif) {
        customerTranscript = removeSpeakerNames(customerTranscript)
    }

    if (!options.ts) {
        customerTranscript = removeTimestamps(customerTranscript)
    }

    return customerTranscript;
};

export default getCustomerTranscript;
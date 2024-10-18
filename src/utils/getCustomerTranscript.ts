import prisma from '@/lib/prisma'

const removeTimestamps = (transcript: string) => transcript.replace(/^\d+:[0-5][0-9]:[0-5][0-9]\.\d+\s/gm, ''); // this is the regex for removing timestamps

const removeSpeakerNames = (transcript: string) => transcript.replace(/(\d+:\d+:\d+\.\d+)\s+[^:]+:/g, '$1:'); // this is the regex for removing speaker names

const removeSpeakerNamesAndTimestamps = (transcript: string) => transcript.replace(/^\d+:[0-5][0-9]:[0-5][0-9]\.\d+\s+[^\:]+:\s/gm, '');

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

    // sif => speaker tracking
    // si => (0 = initial, 1 = full name)
    // ts => timestamps

    if (!options.ts && !options.sif) {
        customerTranscript = removeSpeakerNamesAndTimestamps(customerTranscript);
    } else if (options.sif) {
        if (!options.si) {
            const seenSpeakers = new Set();
            customerTranscript = customerTranscript.replace(/\d+:\d+:\d+\.\d+\s+([a-zA-Z]+)\s([a-zA-Z]+):/g, function (match, p1, p2) {
                const fullName = `${p1} ${p2}`;
                if (seenSpeakers.has(fullName)) {
                    return match.replace(`${p1} ${p2}:`, `${p1.charAt(0).toUpperCase()}${p2.charAt(0).toUpperCase()}:`);
                } else {
                    seenSpeakers.add(fullName);
                    return match; // Keep the full name for the first occurrence
                }
            });
        }
    } else if (!options.sif) {
        customerTranscript = removeSpeakerNames(customerTranscript)
    } else if (!options.ts) {
        customerTranscript = removeTimestamps(customerTranscript)
    }

    return customerTranscript;
};

export default getCustomerTranscript;
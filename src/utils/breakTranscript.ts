export default function breakTranscript(fullTranscript: string, maxLength: number) {
    const transcriptParts: string[] = [];
    let currentIndex = 0;

    while (currentIndex < fullTranscript.length) {
        let endIndex = currentIndex + maxLength;
        if (endIndex < fullTranscript.length) {
            while (
                fullTranscript[endIndex] !== ' ' &&
                endIndex < fullTranscript.length
            ) {
                endIndex++;
            }
        }
        transcriptParts.push(fullTranscript.substring(currentIndex, endIndex));
        currentIndex = endIndex;
    }
    return transcriptParts;
}
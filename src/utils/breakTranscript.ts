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

export function chunkTranscriptLines(
  transcript: string,
  maxChars: number
): string[] {
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  // Split lines by single newline character
  const lines = transcript.trim().split('\n');

  for (const line of lines) {
    const lineLength = line.length + 1; // +1 for '\n'

    // If adding this line would exceed limit, start new chunk
    if (currentLength + lineLength > maxChars) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
      }
      currentChunk = [];
      currentLength = 0;
    }

    currentChunk.push(line);
    currentLength += lineLength;
  }

  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  return chunks;
}

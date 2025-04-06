'use server'
import modifyTestTranscript from '../../editor/modify-test-transcript'
import logger from '@/lib/logger'
import { chunkTranscriptLines } from '@/utils/breakTranscript'

const createTestFile = async (transcript: string, fileId: string) => {
  let modifiedTranscript = '';
  try {

    if (!transcript || transcript.trim() === '') {
      throw new Error('Empty transcript provided');
    }
    const chunks = chunkTranscriptLines(transcript, 25000)
    if (!chunks.length) {
      throw new Error('No chunks created from transcript');
    }

    logger.info(`Total chunks: ${chunks.length}`);
    chunks.forEach((chunk, index) => {
      logger.info(`Chunk ${index + 1} length: ${chunk.length}`);
    });
    // // Process all chunks through the test transcript modifier
    const modifiedChunks = await Promise.all(
      chunks.map(
        async (chunk, index) =>
          await modifyTestTranscript(chunk, index + 1, chunks.length)
      )
    )
    
    modifiedTranscript = modifiedChunks.join('\n')
    logger.info(`Modified transcript created for file ${fileId}`)

  } catch (error) {
    logger.error(
      `Error processing modified transcript for file ${fileId}:`,
      error
    )
    return {
      success: false,
      error: `Failed to create test transcript: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  return {
    success: true,
    data: {
      modifiedTranscript
    }
  }
}

export default createTestFile

import portkeyAI from 'portkey-ai'

import logger from "@/lib/logger"
import { withRetry } from "@/lib/retry"

function generateWERPrompt({ currentChunk, totalChunks, transcript }: { currentChunk: number, totalChunks: number, transcript: string }) {
  return `We are creating a transcriber skills evaluation system. Candidates receive an audio file and a modified transcript that has mistakes and incorrect formats. The candidates need to identify and correct these errors to match the original transcript.

The original transcript will be provided in chunks. Your task is to mess up the original transcript by introducing the textual errors mentioned. 
This is ${currentChunk} chunk out of ${totalChunks} chunks.

Please modify the provided transcript by introducing only TEXTUAL errors. Do NOT attempt to simulate auditory errors. Focus on the following types of textual errors:
Text-based sound-alike substitutions: (e.g., "honour" -> "owner", "principle" -> "principal," "access" -> "axis")
Misspellings: (e.g., "necessary" -> "necesary," "occurrence" -> "occurence")
Omit short sentences from transcript: (remove sentences or phrases)
Word omissions: (remove individual words)
Capitalization errors: (e.g., "the report" -> "The report," "new york" -> "new York")
Number/date alterations: (e.g., "30 percent" -> "13 percent," "June 10th" -> "July 10th")
Filler word insertions: (e.g., "like," "you know," "basically")
Speaker attribution errors: (assign lines to the wrong speaker)
Abbreviations: (e.g., "Medical Device Report" -> "MDR," "New York" -> "NY")


Key points:
- Distribute errors evenly across the transcript.  Avoid concentrating errors in one area.
- Add all types of textual errors mentioned in every chunk. Aim for a variety of error types.
- Focus on the textual changes listed above.
- Misspelling and sound alike substitutions should be used in every chunk.
- Make the transcript challenging for the transcriber. The errors should be realistic and require careful attention to detail.
- Do not remove the timestamps and whole paragraphs. Only remove words and sentences.
- When omitting words, avoid removing the *same* word consistently throughout the transcript. Vary the words you omit.
- Incorporate subtle filler words naturally within the text.

Here is the transcript to modify:
${transcript}
`.trim();
}

const systemPrompt = `You are an expert in transcript modification. Your role is to introduce mistakes into correctly formatted transcripts while maintaining a word error rate were of 30% or close to 30%. You must follow the instructions and introduce necessary mistakes to create a suitable. Test, transcript for candidates. When introducing errors. Prioritize textual errors, such as sound alike, substitutions misspellings, altered dates in measurements and word omissions. The error should be distributed evenly across all chunks. Return modified transcript only as text, no other text or comments.`

// will be expecting a transcript as a string
const modifyTestTranscript = async (transcript: string, currentChunk: number, totalChunks: number) => {
  try{

    const  userPrompt = generateWERPrompt({ currentChunk, totalChunks, transcript });
    
    const portkey = new portkeyAI({
      apiKey: process.env.PORTKEY_API_KEY!,
      virtualKey: process.env.PORTKEY_PROD_GOOGLE_VIRTUAL_KEY,
    })
    const result = await withRetry(
      async () => {
        logger.info(`Modifying transcript for chunk ${currentChunk} of ${totalChunks}`);
        const chatCompletion = await portkey.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: userPrompt,
                },
              ],
            },
          ],
          model: 'gemini-2.0-flash',
          temperature: 1,
        })

        // Extract the transcript text from the response
        const transcriptText = chatCompletion.choices[0]?.message?.content
        if (!transcriptText) {
          logger.error(
            `No transcript content received from Gemini for file`
          )
          throw new Error('No transcript content received from Gemini')
        }
        return transcriptText
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 32000,
        backoffFactor: 2,
        retryErrors: ['Request failed with status code 429'],
      }
    )

    // Format the response with the correct timestamp offset
    if (!result) {
      logger.error(
        `No result received from Gemini request`
      )
      throw new Error('No result received from Gemini request')
    }
    return result.data as string
    
  }
  catch(error){
    logger.error(`Failed to modify test transcript: ${error}`)
    throw new Error("Failed to modify test transcript")
  }
}

export default modifyTestTranscript

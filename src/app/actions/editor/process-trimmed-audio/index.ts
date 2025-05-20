'use server'
import { GoogleAIFileManager, FileState, UploadFileResponse } from '@google/generative-ai/server'
import portkeyAI from 'portkey-ai'

import logger from '@/lib/logger'
import { withRetry } from '@/lib/retry'
import { GeminiModel } from '@/utils/editorUtils'

export interface ExtractAccentResult {
  success: boolean
  fileId?: string
  data?: string
  error?: string
}

/**
 * Processes a trimmed audio file with Google AI
 * @param fileKey The S3 key of the trimmed audio file
 * @param temperature Temperature setting for AI processing
 * @returns Processing results
 */
export async function extractAccentAction(
  fileKey: string,
  uploadedFileResponse: UploadFileResponse
): Promise<ExtractAccentResult> {
  try {
    logger.info(`Starting processTrimmedAudioAction for file: ${fileKey}`)

    const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!)

    // Wait for file processing to complete
    let file = await fileManager.getFile(uploadedFileResponse.file.name)
    logger.info(`File state in getting accent: ${uploadedFileResponse.file.name} ${file.state} ${uploadedFileResponse.file.mimeType} ${uploadedFileResponse.file.uri}`)
    while (file.state === FileState.PROCESSING) {
      process.stdout.write('.')
      file = await fileManager.getFile(uploadedFileResponse.file.name)
    }

    if (file.state === FileState.FAILED) {
      logger.error('Audio processing failed: ', fileKey)
      throw new Error('Audio processing failed.')
    }

    // Initialize Portkey for API access
    const portkey = new portkeyAI({
      apiKey: process.env.PORTKEY_API_KEY!,
      virtualKey: process.env.PORTKEY_PROD_GOOGLE_VIRTUAL_KEY,
    })

    // Define user and system prompts
    const userPrompt = {
      text: `You are given a transcript audio/video file. Your task is to parse the audio and detect the major accent in the audio file. Focus on pronunciation patterns, intonation, vowel/consonant shifts, and rhythm to identify the regional or national origin of the accent. Be as specific as possible (e.g., “Indian English - South Indian”, “American English - Southern US”, “British English - RP”, etc.).
Return the value and label field (e.g., { "value": "NA", "label": "North American" ) that best represents the dominant accent in the file from the given json array.
[
{ "value": "NA", "label": "North American" },
{ "value": "CA", "label": "Canadian" },
{ "value": "AU", "label": "Australian" },
{ "value": "GB", "label": "British" },
{ "value": "IN", "label": "Indian" },
{ "value": "AA", "label": "African-American" },
{ "value": "AF", "label": "African" },
{ "value": "RW", "label": "Rwandan" },
{ "value": "GR", "label": "German" },
{ "value": "FR", "label": "French" },
{ "value": "IT", "label": "Italian" },
{ "value": "PL", "label": "Polish" },
{ "value": "EU", "label": "European" },
{ "value": "SP", "label": "Spanish" },
{ "value": "RU", "label": "Russian" },
{ "value": "FN", "label": "Finnish" },
{ "value": "TK", "label": "Turkish" },
{ "value": "ID", "label": "Indonesian" },
{ "value": "MX", "label": "Mexican" },
{ "value": "HP", "label": "Hispanic" },
{ "value": "LA", "label": "Latin American" },
{ "value": "BR", "label": "Brazilian" },
{ "value": "PR", "label": "Portugese" },
{ "value": "NL", "label": "Dutch" },
{ "value": "ME", "label": "Middle Eastern" },
{ "value": "IR", "label": "Irish" },
{ "value": "AS", "label": "Asian" },
{ "value": "CN", "label": "Chinese" },
{ "value": "KO", "label": "Korean" },
{ "value": "SG", "label": "Singaporean" },
{ "value": "EA", "label": "East Asian" },
{ "value": "NZ", "label": "New Zealand" },
{ "value": "AB", "label": "Arabic" },
{ "value": "MY", "label": "Malaysian" },
{ "value": "JP", "label": "Japanese" },
{ "value": "SE", "label": "Southeast Asian" },
{ "value": "SA", "label": "South African" },
{ "value": "JM", "label": "Jamaican" },
{ "value": "WI", "label": "West Indian" },
{ "value": "AG", "label": "Aboriginal" },
{ "value": "SC", "label": "Scottish" },
{ "value": "NP", "label": "Nepalese" },
{ "value": "EG", "label": "Egyptian" },
{ "value": "AI", "label": "Indigenous American" },
{ "value": "NN", "label": "Other Non-native/Mixed" }
]

Instructions:
Analyze the provided audio file.
Return only the most appropriate JSON object from the array above.
Do not add any explanation or extra text.
If no valid audio is present or the accent is unintelligible, return:
{ "value": "N/A", "label": "No Valid Audio" }
Output format: JSON object only. No preamble, no explanation, no additional text.
`}

    const systemPrompt = {
      text: 'You are an expert linguist and phonetics analyst. Given a transcript and/or an audio file, your task is to determine the most likely accent of the speaker(s). ',
    }

    const result = await withRetry(
      async () => {
        const chatCompletion = await portkey.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: systemPrompt.text,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: userPrompt.text,
                },
                {
                  type: 'file',
                  file: {
                    uri: uploadedFileResponse.file.uri,
                    mimeType: uploadedFileResponse.file.mimeType,
                  },
                },
              ],
            },
          ],
          model: GeminiModel.GEMINI_2_0_FLASH,
          temperature: 1,
        })

        const responseText = chatCompletion.choices[0]?.message?.content
        if (!responseText) {
          logger.error(
            `No content received from AI processing for file: ${fileKey}`
          )
          throw new Error('No content received from AI processing')
        }

        return responseText
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 32000,
        backoffFactor: 2,
        retryErrors: ['Request failed with status code 429', 'network error'],
      }
    )

    if (!result.success) {
      logger.error(`Failed to process audio file ${fileKey}: ${result.error}`)
      return {
        success: false,
        error: `AI processing failed: ${result.error}`
      }
    }
    logger.info(`[${fileKey}] Successfully extracted accent from audio file. Accent: ${result.data}`)
    return {
      success: true,
      fileId: fileKey.split('.')[0], // Extract fileId from the fileKey
      data: result.data as string
    }
  } catch (error) {
    logger.error(`Error in processTrimmedAudioAction: ${error}`)
    return {
      success: false,
      error: `Processing failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }
} 
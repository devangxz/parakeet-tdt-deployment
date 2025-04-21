import fs from 'fs'
import os from 'os'
import path from 'path'

import { AssemblyAI, TranscriptWord } from 'assemblyai'
import axios from 'axios'
import OpenAI from 'openai'

import config from '../../config.json'
import logger from '../lib/logger'
import prisma from '../lib/prisma'
import { redis } from '../lib/redis'
import { getAWSSesInstance } from '../lib/ses'
import { getSignedURLFromS3 } from '../utils/backend-helper'

interface AudioChunk {
  fileKey: string
  startTime: number
  endTime: number
}

interface ASRStats {
  assemblyAIStartTime: Date
  assemblyAIEndTime: Date
  assemblyAITimeTaken: number
  chunkingStartTime?: Date
  chunkingEndTime?: Date
  chunkingTimeTaken?: number
  gpt4oTranscribeStartTime?: Date
  gpt4oTranscribeEndTime?: Date
  gpt4oTranscribeTimeTaken?: number
}

interface ASRResult {
  words: TranscriptWord[]
  gptTranscript?: string
  ASRElapsedTime: number
  fileId: string
  asrStats: ASRStats
}

const MIN_CHUNK_S = 240
const MAX_CHUNK_S = 360
const PAUSE_THRESHOLD_MS = 500
const MAX_RETRY_COUNT = 3
const FILE_CACHE_URL = process.env.NEXT_PUBLIC_FILE_CACHE_URL

async function createAudioChunks(
  fileId: string,
  duration: number,
  words: TranscriptWord[]
): Promise<AudioChunk[]> {
  logger.info(
    `[${fileId}] Creating optimal audio chunks (target: ${MIN_CHUNK_S}-${MAX_CHUNK_S}s)`
  )

  if (duration <= MAX_CHUNK_S) {
    logger.info(
      `[${fileId}] Audio duration (${duration}s) is less than or equal to max chunk size (${MAX_CHUNK_S}s). Using single chunk.`
    )
    return [
      {
        fileKey: `${fileId}.mp3`,
        startTime: 0,
        endTime: duration,
      },
    ]
  }

  const calculatedChunks: { startTime: number; endTime: number }[] = []
  let chunkStartTime = 0
  let wordIndex = 0

  while (chunkStartTime < duration) {
    const remainingDuration = duration - chunkStartTime
    if (remainingDuration <= MIN_CHUNK_S) {
      calculatedChunks.push({ startTime: chunkStartTime, endTime: duration })
      logger.info(
        `[${fileId}] Final chunk covers remaining ${remainingDuration.toFixed(
          2
        )}s from ${chunkStartTime.toFixed(2)}s to ${duration.toFixed(2)}s`
      )
      break
    }

    const potentialMinEndTime = chunkStartTime + MIN_CHUNK_S
    const potentialMaxEndTime = chunkStartTime + MAX_CHUNK_S
    let bestSplitTimeSec = -1
    let forceSplitTimeSec = -1
    let bestSplitScore = -1

    let currentWordIndex = wordIndex
    while (
      currentWordIndex < words.length &&
      words[currentWordIndex].end / 1000 < potentialMaxEndTime
    ) {
      const word = words[currentWordIndex]
      const wordEndTimeSec = word.end / 1000

      forceSplitTimeSec = wordEndTimeSec

      if (wordEndTimeSec >= potentialMinEndTime) {
        const nextWord = words[currentWordIndex + 1]
        const isSentenceEnd = ['.', '?', '!'].some((punc) =>
          word.text.endsWith(punc)
        )
        const hasPause =
          nextWord && nextWord.start - word.end >= PAUSE_THRESHOLD_MS
        const hasSpeakerChange =
          nextWord &&
          typeof word.speaker === 'string' &&
          typeof nextWord.speaker === 'string' &&
          word.speaker !== nextWord.speaker

        let currentScore = 0
        if (isSentenceEnd) {
          currentScore = 1
          if (hasPause) {
            currentScore = 2
            if (hasSpeakerChange) {
              currentScore = 3
            }
          }
        }

        if (currentScore > 0 && currentScore >= bestSplitScore) {
          if (
            currentScore > bestSplitScore ||
            wordEndTimeSec > bestSplitTimeSec
          ) {
            bestSplitScore = currentScore
            bestSplitTimeSec = wordEndTimeSec
          }
        }
      }
      currentWordIndex++
    }

    let chunkEndTime: number
    if (bestSplitTimeSec !== -1) {
      chunkEndTime = bestSplitTimeSec
      logger.info(
        `[${fileId}] Found ideal split point at ${chunkEndTime.toFixed(
          2
        )}s (Score: ${bestSplitScore})`
      )
    } else if (forceSplitTimeSec !== -1 && chunkStartTime < forceSplitTimeSec) {
      chunkEndTime = forceSplitTimeSec
      logger.info(
        `[${fileId}] No ideal split point found, forcing split at latest word end: ${chunkEndTime.toFixed(
          2
        )}s`
      )
    } else {
      chunkEndTime = Math.min(potentialMaxEndTime, duration)
      logger.info(
        `[${fileId}] No suitable word end found within window or remaining duration too short, splitting at ${chunkEndTime.toFixed(
          2
        )}s (max duration or end of file)`
      )
      if (chunkEndTime <= chunkStartTime) {
        chunkEndTime = duration
        logger.error(
          `[${fileId}] Chunk end time calculation stuck, setting to full duration to avoid loop.`
        )
      }
    }

    chunkEndTime = Math.min(chunkEndTime, duration)

    if (chunkEndTime <= chunkStartTime) {
      if (chunkStartTime < duration) {
        logger.info(
          `[${fileId}] Chunk end time (${chunkEndTime}) is not greater than start time (${chunkStartTime}). Setting to duration (${duration}) to finish.`
        )
        chunkEndTime = duration
      } else {
        break
      }
    }

    calculatedChunks.push({ startTime: chunkStartTime, endTime: chunkEndTime })

    chunkStartTime = chunkEndTime

    while (
      wordIndex < words.length &&
      words[wordIndex].start / 1000 < chunkStartTime
    ) {
      wordIndex++
    }

    if (chunkStartTime >= duration) {
      break
    }
  }

  logger.info(
    `[${fileId}] Calculated ${calculatedChunks.length} optimal chunk boundaries. Now requesting creation via file-cache server.`
  )

  const finalChunks: AudioChunk[] = []
  const totalChunks = calculatedChunks.length

  for (let i = 0; i < totalChunks; i++) {
    const { startTime, endTime } = calculatedChunks[i]
    const currentChunkIndex = i + 1
    logger.info(
      `[${fileId}] Requesting creation of chunk ${currentChunkIndex}/${totalChunks}: ${startTime.toFixed(
        2
      )}s to ${endTime.toFixed(2)}s`
    )

    let retryCount = 0
    let success = false

    while (retryCount < MAX_RETRY_COUNT && !success) {
      try {
        const response = await axios.post(`${FILE_CACHE_URL}/create-chunks`, {
          fileId,
          startTime,
          endTime,
          currentChunk: currentChunkIndex,
          totalChunks: totalChunks,
        })

        if (response.data.success && response.data.trimmedFileKey) {
          finalChunks.push({
            fileKey: response.data.trimmedFileKey,
            startTime,
            endTime,
          })
          logger.info(
            `[${fileId}] Successfully received chunk ${currentChunkIndex} key: ${response.data.trimmedFileKey}`
          )
          success = true
        } else {
          throw new Error(
            `File-cache server failed for chunk ${currentChunkIndex}: ${JSON.stringify(
              response.data
            )}`
          )
        }
      } catch (error) {
        retryCount++
        logger.error(
          `[${fileId}] Error requesting chunk ${currentChunkIndex} from file-cache server (attempt ${retryCount}/${MAX_RETRY_COUNT}): ${error}`
        )

        if (retryCount >= MAX_RETRY_COUNT) {
          throw new Error(
            `Failed to create chunk ${currentChunkIndex} via file-cache server after ${MAX_RETRY_COUNT} attempts: ${error}`
          )
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
      }
    }
  }

  logger.info(
    `[${fileId}] Created ${finalChunks.length} audio chunks via file-cache server successfully.`
  )
  return finalChunks
}

async function performGPT4oTranscription(
  fileId: string,
  audioChunks: AudioChunk[]
): Promise<string> {
  const tempResources: { dir: string; path: string }[] = []

  try {
    logger.info(
      `[${fileId}] Starting GPT-4o Transcribe transcription using ${audioChunks.length} chunks`
    )
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    const combinedTranscript: string[] = []
    let previousChunkTranscript = ''

    const basePrompt = `Please transcribe this audio professionally with the following requirements: 
       1) Proper punctuation (Example: "Hello, welcome to my lecture. Today, we'll be discussing the course topics.") 
       2) All filler words (Example: "Umm, let me think like, hmm... Okay, here's what I'm thinking.") 
       3) Exact wording, technical terms, acronyms, names, and numbers.`

    for (let i = 0; i < audioChunks.length; i++) {
      const chunk = audioChunks[i]
      const chunkIndex = i + 1
      let chunkRetryCount = 0
      let chunkSuccess = false

      let chunkPrompt = basePrompt

      if (previousChunkTranscript) {
        chunkPrompt += ` The previous segment's transcript was: "${previousChunkTranscript}"`
      }

      chunkPrompt += ` This is segment ${chunkIndex} of ${
        audioChunks.length
      }, from ${chunk.startTime.toFixed(2)}s to ${chunk.endTime.toFixed(2)}s.`

      const tempDir = path.join(
        os.tmpdir(),
        `gpt4o-chunk-${fileId}-${chunkIndex}`
      )
      const localPath = path.join(tempDir, path.basename(chunk.fileKey))
      tempResources.push({ dir: tempDir, path: localPath })

      try {
        while (chunkRetryCount < MAX_RETRY_COUNT && !chunkSuccess) {
          try {
            logger.info(
              `[${fileId}] Transcribing chunk ${chunkIndex}/${
                audioChunks.length
              } with GPT-4o (attempt ${chunkRetryCount + 1}/${MAX_RETRY_COUNT})`
            )

            const signedUrl = await getSignedURLFromS3(
              chunk.fileKey,
              config.aws_signed_url_expiration
            )

            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true })
            }

            const response = await fetch(signedUrl)
            if (!response.ok) {
              throw new Error(
                `Failed to download chunk: ${response.status} ${response.statusText}`
              )
            }

            const buffer = await response.arrayBuffer()
            fs.writeFileSync(localPath, new Uint8Array(buffer))
            logger.info(
              `[${fileId}] Downloaded chunk ${chunkIndex} successfully`
            )

            const transcriptionResult =
              await openai.audio.transcriptions.create({
                file: fs.createReadStream(localPath),
                model: 'gpt-4o-transcribe',
                prompt: chunkPrompt,
              })

            logger.info(
              `[${fileId}] Completed transcription of chunk ${chunkIndex}`
            )

            const chunkTranscript = transcriptionResult.text
            combinedTranscript.push(chunkTranscript)

            previousChunkTranscript = chunkTranscript
            chunkSuccess = true
          } catch (error) {
            chunkRetryCount++
            logger.error(
              `[${fileId}] Error transcribing chunk ${chunkIndex} (attempt ${chunkRetryCount}/${MAX_RETRY_COUNT}): ${error}`
            )

            if (chunkRetryCount >= MAX_RETRY_COUNT) {
              throw new Error(
                `Failed to transcribe chunk ${chunkIndex} after ${MAX_RETRY_COUNT} attempts`
              )
            }

            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * chunkRetryCount)
            )
          }
        }
      } finally {
        try {
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath)
          if (fs.existsSync(tempDir))
            fs.rmSync(tempDir, { recursive: true, force: true })

          const index = tempResources.findIndex((r) => r.path === localPath)
          if (index !== -1) tempResources.splice(index, 1)

          logger.info(
            `[${fileId}] Cleaned up temp files for chunk ${chunkIndex}`
          )
        } catch (cleanupError) {
          logger.error(
            `[${fileId}] Failed to clean up temp files for chunk ${chunkIndex}: ${cleanupError}`
          )
        }
      }
    }

    const finalTranscript = combinedTranscript
      .map((text, index) => {
        if (index === 0) return text

        const prevChunk = combinedTranscript[index - 1]
        const overlapSize = 30

        if (prevChunk.length > overlapSize && text.length > overlapSize) {
          const prevEnd = prevChunk.slice(-overlapSize)
          const currentStart = text.slice(0, overlapSize)

          let maxOverlap = 0
          for (
            let i = 1;
            i <= Math.min(prevEnd.length, currentStart.length);
            i++
          ) {
            if (prevEnd.slice(-i) === currentStart.slice(0, i)) {
              maxOverlap = i
            }
          }

          if (maxOverlap > 5) {
            return text.slice(maxOverlap)
          }
        }

        return text
      })
      .join(' ')

    logger.info(
      `[${fileId}] GPT-4o Transcribe transcription completed successfully`
    )

    return finalTranscript
  } catch (error) {
    logger.error(
      `[${fileId}] Error during GPT-4o transcription process: ${error}`
    )
    throw error
  } finally {
    for (const resource of tempResources) {
      try {
        if (fs.existsSync(resource.path)) fs.unlinkSync(resource.path)
        if (fs.existsSync(resource.dir))
          fs.rmSync(resource.dir, { recursive: true, force: true })
        logger.info(
          `[${fileId}] Cleaned up remaining temp resource: ${resource.path}`
        )
      } catch (cleanupError) {
        logger.error(
          `[${fileId}] Failed to clean up temp resource ${resource.path}: ${cleanupError}`
        )
      }
    }
  }
}

export async function performASR(fileId: string): Promise<ASRResult> {
  logger.info(`[${fileId}] Starting ASR process`)

  try {
    const order = await prisma.order.findUnique({ where: { fileId } })
    if (!order) {
      logger.error(`[${fileId}] Order not found in database`)
      throw new Error(`Order not found for ${fileId}`)
    }

    const file = await prisma.file.findUnique({
      where: { fileId },
    })
    if (!file) {
      logger.error(`[${fileId}] File not found in database`)
      throw new Error(`File not found for ${fileId}`)
    }

    const fileURL = await getSignedURLFromS3(
      `${fileId}.mp3`,
      config.aws_signed_url_expiration
    )

    const startTime = Date.now()

    const assemblyAIStartTime = new Date()
    logger.info(
      `[${fileId}] Starting AssemblyAI transcription at ${assemblyAIStartTime.toISOString()}`
    )

    const assemblyClient = new AssemblyAI({ apiKey: process.env.ASSEMBLY_KEY! })
    const assemblyResult = await assemblyClient.transcripts.transcribe({
      audio: fileURL,
      punctuate: true,
      speaker_labels: true,
    })

    const assemblyAIEndTime = new Date()
    const assemblyAITimeTaken = Math.round(
      (assemblyAIEndTime.getTime() - assemblyAIStartTime.getTime()) / 1000
    )
    logger.info(
      `[${fileId}] AssemblyAI transcription completed at ${assemblyAIEndTime.toISOString()} (took ${assemblyAITimeTaken} seconds)`
    )

    if (!assemblyResult.words || assemblyResult.words.length === 0) {
      logger.error(`[${fileId}] AssemblyAI returned no words`)
      throw new Error(
        'AssemblyAI returned no words, cannot perform optimal chunking.'
      )
    }

    logger.info(`[${fileId}] AssemblyAI transcription completed successfully`)

    let gptTranscript
    let chunkingStartTime
    let chunkingEndTime
    let chunkingTimeTaken
    let gpt4oTranscribeStartTime
    let gpt4oTranscribeEndTime
    let gpt4oTranscribeTimeTaken

    try {
      chunkingStartTime = new Date()
      logger.info(
        `[${fileId}] Starting audio chunking process at ${chunkingStartTime.toISOString()}`
      )

      const audioChunks = await createAudioChunks(
        fileId,
        file.duration,
        assemblyResult.words
      )

      chunkingEndTime = new Date()
      chunkingTimeTaken = Math.round(
        (chunkingEndTime.getTime() - chunkingStartTime.getTime()) / 1000
      )
      logger.info(
        `[${fileId}] Audio chunking completed at ${chunkingEndTime.toISOString()} (took ${chunkingTimeTaken} seconds)`
      )

      gpt4oTranscribeStartTime = new Date()
      logger.info(
        `[${fileId}] Starting GPT-4o transcription at ${gpt4oTranscribeStartTime.toISOString()}`
      )

      gptTranscript = await performGPT4oTranscription(fileId, audioChunks)

      gpt4oTranscribeEndTime = new Date()
      gpt4oTranscribeTimeTaken = Math.round(
        (gpt4oTranscribeEndTime.getTime() -
          gpt4oTranscribeStartTime.getTime()) /
          1000
      )
      logger.info(
        `[${fileId}] GPT-4o transcription completed at ${gpt4oTranscribeEndTime.toISOString()} (took ${gpt4oTranscribeTimeTaken} seconds)`
      )
    } catch (error) {
      logger.error(
        `[${fileId}] GPT-4o transcription failed, continuing with AssemblyAI results only: ${error}`
      )
    }

    const ASRElapsedTime = (Date.now() - startTime) / 1000

    const asrStats: ASRStats = {
      assemblyAIStartTime,
      assemblyAIEndTime,
      assemblyAITimeTaken,
      chunkingStartTime,
      chunkingEndTime,
      chunkingTimeTaken,
      gpt4oTranscribeStartTime,
      gpt4oTranscribeEndTime,
      gpt4oTranscribeTimeTaken,
    }

    const result: ASRResult = {
      words: assemblyResult.words,
      ...(gptTranscript && { gptTranscript }),
      ASRElapsedTime,
      fileId,
      asrStats,
    }

    logger.info(
      `[${fileId}] ASR process completed successfully. Total processing time: ${ASRElapsedTime.toFixed(
        2
      )} seconds`
    )
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`[${fileId}] ASR process failed: ${errorMessage}`)

    const retryData = JSON.parse((await redis.get('ASR_RETRY_COUNT')) || '{}')
    const retryCount = retryData[fileId] || 0

    if (retryCount >= 3) {
      if (errorMessage.toLowerCase().includes('account balance is negative')) {
        logger.error(
          `[${fileId}] AssemblyAI account balance is negative, sending alert`
        )
        const ses = getAWSSesInstance()
        await ses.sendAlert(
          `Negative Assembly AI Account Balance`,
          `ASR failed for ${fileId} due to account balance being negative. Please add more credits.`,
          'software'
        )
      }
      logger.error(`[${fileId}] Max retries reached (3/3), failing`)
      throw error
    }

    await redis.set(
      'ASR_RETRY_COUNT',
      JSON.stringify({ ...retryData, [fileId]: retryCount + 1 }),
      'EX',
      3600
    )

    logger.info(`[${fileId}] Retry #${retryCount + 1} of 3`)
    return performASR(fileId)
  }
}

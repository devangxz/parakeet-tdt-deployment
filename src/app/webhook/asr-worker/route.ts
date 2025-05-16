import { OrderStatus, ReportMode, ReportOption } from '@prisma/client'
import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import config from '../../../../config.json'
import { getAccentAction, GetAccentResult } from '@/app/actions/editor/process-audio-chunk'
import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { calculatePWER, isPwerAboveThreshold } from '@/utils/asr/quality'
import {
  getAssemblyAITranscript,
  createCombinedTranscript,
} from '@/utils/asr/transcript'
import { checkCombinedASRFormat } from '@/utils/asr/validation'
import authenticateWebhook from '@/utils/authenticateWebhook'
import { getCTMs, createAlignments, updateAlignments } from '@/utils/transcript'

export async function POST(req: NextRequest) {
  // Authenticate webhook and check rate limit
  const authResult = await authenticateWebhook(req, 'ASR-WORKER')
  if (authResult.error) return authResult.error

  const asrResult = await req.json()

  try {
    if (!asrResult || !asrResult.fileId) {
      return NextResponse.json({ error: 'Invalid ASR result' }, { status: 400 })
    }

    const { words, gptTranscript, ASRElapsedTime, fileId, asrStats } = asrResult

    const order = await prisma.order.findUnique({
      where: { fileId },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const assemblyAICTMs = getCTMs(words)
    const assemblyAITranscript = getAssemblyAITranscript(assemblyAICTMs)

    let combinedTranscript = null
    let combinedCTMs = null
    let formattingCheckResult = null

    if (gptTranscript) {
      logger.info(
        `[${fileId}] GPT transcript available, creating combined transcript`
      )
      combinedTranscript = createCombinedTranscript(
        assemblyAITranscript,
        gptTranscript,
        fileId
      )

      if (combinedTranscript) {
        const assemblyAIAlignments = createAlignments(
          assemblyAITranscript,
          assemblyAICTMs
        )
        const alignments = updateAlignments(
          combinedTranscript,
          assemblyAIAlignments,
          assemblyAICTMs
        )

        combinedCTMs = alignments
          .filter((alignment) => alignment.type === 'ctm')
          .map((alignment) => ({
            start: alignment.start,
            end: alignment.end,
            word: alignment.word.toLowerCase().replace(/[^\w\s]/g, ''),
            conf: alignment.conf,
            punct: alignment.punct,
            source: 'assembly_ai',
            speaker: alignment.speaker,
            ...(alignment.turn && { turn: alignment.turn }),
          }))

        formattingCheckResult = checkCombinedASRFormat(combinedTranscript)
        logger.info(
          `[${fileId}] Combined ASR format validation ${
            formattingCheckResult.isValid
              ? 'passed'
              : `failed with ${formattingCheckResult.errors.length} issue(s)`
          }.`
        )
      }
    } else {
      logger.info(
        `[${fileId}] No GPT transcript available, using AssemblyAI transcript only`
      )
    }

    const transcriptPayload: {
      fileId: string
      userId: number
      assemblyAITranscript: string
      assemblyAICTMs: ReturnType<typeof getCTMs>
      gptTranscript?: string
      combinedTranscript?: string
      combinedCTMs?: ReturnType<typeof getCTMs>
      transcript: string
    } = {
      fileId,
      userId: order.userId,
      assemblyAITranscript,
      assemblyAICTMs,
      transcript: combinedTranscript || assemblyAITranscript,
    }

    if (gptTranscript) {
      transcriptPayload.gptTranscript = gptTranscript
    }
    if (combinedTranscript) {
      transcriptPayload.combinedTranscript = combinedTranscript
    }
    if (combinedCTMs) {
      transcriptPayload.combinedCTMs = combinedCTMs
    }

    await axios.post(`${FILE_CACHE_URL}/save-transcript`, transcriptPayload, {
      headers: {
        'x-api-key': process.env.SCRIBIE_API_KEY,
      },
    })

    const pwer = gptTranscript
      ? calculatePWER(assemblyAITranscript, fileId, gptTranscript)
      : calculatePWER(words, fileId)

    const qualityCheck = isPwerAboveThreshold(pwer, fileId)

    const orderUpdateData = {
      ASRTimeTaken: ASRElapsedTime,
      pwer,
      initialPwer: pwer,
      combinedASRFormatValidation: formattingCheckResult
        ? JSON.parse(JSON.stringify(formattingCheckResult))
        : null,
    }

    const accent: GetAccentResult = await getAccentAction(fileId)

    if (accent.success && accent.data) {
      const accentResponse = JSON.parse(accent.data)
      const accentValue = accentResponse.value || 'N/A'
      logger.info(`[${fileId}] Extracted accent: ${accentValue}`)
      if(accentValue in config.accents_list) {
        await prisma.fileAccent.create(
          {
            data: {
              userId: order.userId,
              fileId,
              accentCode: accentValue,
            },
          }
        )
      }
    }
    else{
      logger.error(`[${fileId}] Failed to get accent using default accent: ${accent.error} ${JSON.stringify(accent)}`)
      await prisma.fileAccent.create(
        {
          data: {
            userId: order.userId,
            fileId,
            accentCode: 'N/A',
          },
        }
      )
    }

    if (qualityCheck.requiresManualScreening) {
      await prisma.order.update({
        where: { fileId },
        data: {
          ...orderUpdateData,
          reportMode: ReportMode.AUTO,
          reportOption: ReportOption.AUTO_PWER_ABOVE_THRESHOLD,
          reportComment: qualityCheck.screeningReason,
          status: OrderStatus.SUBMITTED_FOR_SCREENING,
        },
      })
    } else {
      await prisma.order.update({
        where: { fileId },
        data: {
          ...orderUpdateData,
          status: OrderStatus.TRANSCRIBED,
          updatedAt: new Date(),
        },
      })
    }

    try {
      await prisma.aSRProcessStats.create({
        data: {
          fileId: fileId,
          orderId: order.id,
          assemblyAIStartTime: new Date(asrStats.assemblyAIStartTime),
          assemblyAIEndTime: new Date(asrStats.assemblyAIEndTime),
          assemblyAITimeTaken: asrStats.assemblyAITimeTaken,
          chunkingStartTime: asrStats.chunkingStartTime
            ? new Date(asrStats.chunkingStartTime)
            : null,
          chunkingEndTime: asrStats.chunkingEndTime
            ? new Date(asrStats.chunkingEndTime)
            : null,
          chunkingTimeTaken: asrStats.chunkingTimeTaken,
          gpt4oTranscribeStartTime: asrStats.gpt4oTranscribeStartTime
            ? new Date(asrStats.gpt4oTranscribeStartTime)
            : null,
          gpt4oTranscribeEndTime: asrStats.gpt4oTranscribeEndTime
            ? new Date(asrStats.gpt4oTranscribeEndTime)
            : null,
          gpt4oTranscribeTimeTaken: asrStats.gpt4oTranscribeTimeTaken,
          totalASRTimeTaken: ASRElapsedTime,
        },
      })
      logger.info(`[${fileId}] Saved ASR process stats to database`)
    } catch (statsError) {
      logger.error(
        `[${fileId}] Failed to save ASR process stats: ${statsError}. Continuing with order update.`
      )
    }

    logger.info(`[${fileId}] ASR webhook processed successfully`)
    return NextResponse.json(
      {
        success: true,
        pwer,
        hasGptTranscript: !!gptTranscript,
        hasCombinedTranscript: !!combinedTranscript,
        status: qualityCheck.requiresManualScreening
          ? 'SUBMITTED_FOR_SCREENING'
          : 'TRANSCRIBED',
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error(
      `[${asrResult?.fileId}] Error processing ASR webhook: ${error}`
    )
    return NextResponse.json(
      {
        error: `Error processing ASR webhook for file ID ${asrResult?.fileId}`,
      },
      { status: 500 }
    )
  }
}

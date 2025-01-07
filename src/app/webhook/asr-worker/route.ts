import { OrderStatus, ReportMode, ReportOption } from "@prisma/client";
import { Word } from "assemblyai";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server"

import config from '../../../../config.json'
import { FILE_CACHE_URL } from "@/constants";
import logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import authenticateWebhook from "@/utils/authenticateWebhook";

function calculatePWER(words: Word[]): number {
    logger.info('--> ASRAssemblyAI:calculatePWER');
    const threshold = config.asr.low_confidence_threshold;
    const lowConfidenceWords = words.filter(
        (word: Word) => word.confidence < threshold,
    );

    const pwer = lowConfidenceWords.length / words.length;
    const roundedPWER = parseFloat(pwer.toFixed(2));
    logger.info(`<-- ASRAssemblyAI:calculatePWER ${roundedPWER}`);
    return roundedPWER;
}

function isPwerAboveThreshold(pwer: number): {
    result: boolean;
    details: string;
} {
    logger.info(`--> isPwerAboveThreshold - ${pwer}`);
    let qcPassed = false;
    let details = '';
    if (pwer > config.asr.pwer_threshold) {
        qcPassed = true;
        details = `PWER ${pwer} > ASR PWER THRESHOLD ${config.asr.pwer_threshold}`;
    } else {
        qcPassed = false;
        details = `PWER ${pwer} < ASR PWER THRESHOLD ${config.asr.pwer_threshold}`;
    }
    logger.info(`<-- isPwerAboveThreshold - ${qcPassed} ${details}`);
    return { result: qcPassed, details: details };
}

export async function POST(req: NextRequest) {
    // Authenticate webhook and check rate limit
    const authResult = await authenticateWebhook(req, 'ASR-WORKER')
    if (authResult.error) return authResult.error

    const asrResult = await req.json()
    const { fileId, transcript, ctms, words, ASRElapsedTime } = asrResult

    logger.info(`${fileId}, ${transcript}, ${ctms}, ${words}, ${ASRElapsedTime}`)

    try {
        console.log(fileId)
        const order = await prisma.order.findUnique({
            where: { fileId }
        })

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            )
        }

        // 1. Save transcript to file cache
        await axios.post(`${FILE_CACHE_URL}/save-transcript`, {
            fileId: fileId,
            transcript: transcript,
            ctms: ctms,
            userId: order.userId,
        }, {
            headers: {
                'x-api-key': process.env.SCRIBIE_API_KEY
            }
        })

        // 2. Calculate PWER
        const pwer = calculatePWER(words)

        logger.info(`<-- transcribe ${fileId}`)

        const testResult = isPwerAboveThreshold(pwer)
        if (testResult.result === true) {
            logger.info('Pwer > Threshold')
            await prisma.order.update({
                where: { fileId },
                data: {
                    ASRTimeTaken: ASRElapsedTime,
                    pwer: pwer,
                    reportMode: ReportMode.AUTO,
                    reportOption: ReportOption.AUTO_PWER_ABOVE_THRESHOLD,
                    reportComment: testResult.details,
                    status: OrderStatus.SUBMITTED_FOR_SCREENING,
                }
            })
        } else {
            await prisma.order.update({
                where: { fileId },
                data: {
                    ASRTimeTaken: ASRElapsedTime,
                    pwer: pwer,
                    status: OrderStatus.TRANSCRIBED,
                }
            })
        }

        logger.info(`ASR webhook processed successfully for file ID ${fileId}`)
        return NextResponse.json(null, { status: 200 })

    } catch (error) {
        logger.error(
            `Error processing ASR webhook for file ID ${fileId}:`,
            error
        )
        return NextResponse.json(
            { error: `Error processing ASR webhook for file ID ${fileId}` },
            { status: 500 }
        )
    }
}
import { OrderStatus, ReportMode, ReportOption } from ".prisma/client";
import { AssemblyAI, Word } from "assemblyai";
import axios from "axios";

import config from "../../config.json";
import { FILE_CACHE_URL } from "../constants";
import logger from "../lib/logger";
import prisma from "../lib/prisma";
import { redis } from '../lib/redis'
import { getSignedURLFromS3 } from "../utils/backend-helper";
import { getFormattedTranscript, getCTMs } from "../utils/transcript";

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

async function transcribe(fileURL: string, fileId: string) {
    const client = new AssemblyAI({
        apiKey: process.env.ASSEMBLY_KEY!,
    });

    const transcriptData = await client.transcripts.transcribe({
        audio: fileURL,
        punctuate: true,
        speaker_labels: true,
    });

    if (!transcriptData.words) {
        throw new Error('Transcription failed');
    }

    const ctms = getCTMs(transcriptData.words);
    const transcript = getFormattedTranscript(ctms);
    logger.info(`<-- ASRAssemblyAI:transcribe ${fileId}`);
    return { transcript, ctms, words: transcriptData.words };
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

export async function performASR(fileId: string): Promise<void> {
    try {
        const transcriptFileName = `${fileId}.txt`;

        const order = await prisma.order.findUnique({
            where: {
                fileId: fileId,
            },
        });

        if (!order) {
            throw new Error(`Order not found for ${fileId}`)
        }

        const fileURL = await getSignedURLFromS3(
            `${fileId}.mp3`,
            config.aws_signed_url_expiration,
        );
        logger.info(`transcriptFileName ${transcriptFileName} fileURL ${fileURL}`);

        const startTime = Date.now();
        const { transcript, ctms, words } = await transcribe(fileURL, fileId);
        const endTime = Date.now();
        const ASRElapsedTime = (endTime - startTime) / 1000;

        logger.info(`ASRElapsedTime ${ASRElapsedTime}`);

        await axios.post(`${FILE_CACHE_URL}/save-transcript`, {
            fileId: fileId,
            transcript: transcript,
            ctms: ctms,
            userId: order.userId,
        }, {
            headers: {
                'x-api-key': process.env.SCRIBIE_API_KEY
            }
        });

        // 2. Calculate PWER
        const pwer = calculatePWER(words);

        logger.info(`<-- transcribe ${fileId}`);

        const testResult = isPwerAboveThreshold(pwer);
        if (testResult.result === true) {
            logger.info('Pwer > Threshold');
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
            });
        } else {
            await prisma.order.update({
                where: { fileId },
                data: {
                    ASRTimeTaken: ASRElapsedTime,
                    pwer: pwer,
                    status: OrderStatus.TRANSCRIBED,
                }
            });
        }
    } catch (error) {
        const allRetryCounts = JSON.parse(await redis.get('ASR_RETRY_COUNT') || '{}')

        if (!allRetryCounts[fileId]) {
            await redis.set('ASR_RETRY_COUNT', JSON.stringify({ [fileId]: 1 }), 'EX', 3600)
            await performASR(fileId)
            return;
        }

        const retryCount: number = allRetryCounts[fileId]

        if (retryCount >= 3) {
            logger.error(`Error transcribing file ${fileId} ${error}`);
            throw error;
        } else {
            await redis.set('ASR_RETRY_COUNT', JSON.stringify({ ...allRetryCounts, [fileId]: retryCount + 1 }), 'EX', 3600)
            await performASR(fileId)
        }

    }
};

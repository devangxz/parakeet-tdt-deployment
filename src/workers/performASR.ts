import { AssemblyAI, Word } from "assemblyai";

import config from "../../config.json";
import logger from "../lib/logger";
import prisma from "../lib/prisma";
import { redis } from '../lib/redis'
import { getSignedURLFromS3 } from "../utils/backend-helper";
import { getFormattedTranscript, getCTMs, CTMType } from "../utils/transcript";

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

export async function performASR(fileId: string): Promise<{
    transcript: string;
    ctms: CTMType[];
    words: Word[];
    ASRElapsedTime: number;
    fileId: string;
} | undefined> {
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

        return {
            transcript,
            ctms,
            words,
            ASRElapsedTime,
            fileId,
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

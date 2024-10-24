import { FileTag } from "@prisma/client";
import { diffWords } from "diff";

import { getFileVersionFromS3 } from "./backend-helper";
import config from '../../config.json';
import logger from "@/lib/logger";
import prisma from "@/lib/prisma";

export default async function qualityCriteriaPassed(
    fileId: string,
): Promise<{ result: boolean; details: string }> {
    logger.info(`--> qualityCriteriaPassed ${fileId}`);

    // Calculate the diff will be between the <fileId>_asr.txt and the <fileId>_qc.txt.

    const ASRFileVersion = await prisma.fileVersion.findFirst({
        where: {
            fileId,
            tag: FileTag.AUTO
        },
        select: {
            s3VersionId: true
        }
    })

    if (!ASRFileVersion || !ASRFileVersion.s3VersionId) {
        throw new Error(`File version for ASR not found for file ${fileId}`);
    }

    const filename = `${fileId}.txt`;
    const asrData = (await getFileVersionFromS3(filename, ASRFileVersion?.s3VersionId)).toString();
    if (!asrData) {
        throw new Error('Transcript not found');
    }

    const QCFileVersion = await prisma.fileVersion.findFirst({
        where: {
            fileId,
            tag: FileTag.QC_DELIVERED
        },
        select: {
            s3VersionId: true
        }
    })

    if (!QCFileVersion || !QCFileVersion.s3VersionId) {
        throw new Error(`File version for QC not found for file ${fileId}`);
    }

    const qcData = (await getFileVersionFromS3(filename, QCFileVersion?.s3VersionId)).toString();

    if (!qcData) {
        throw new Error('Transcript not found');
    }

    const diff = diffWords(asrData, qcData);

    let totalAdditions = 0;
    let totalRemovals = 0;
    diff.forEach((change: { added?: boolean; removed?: boolean }) => {
        if (change.added) {
            totalAdditions += 1;
        } else if (change.removed) {
            totalRemovals += 1;
        }
    });

    const totalChanges = totalAdditions + totalRemovals;
    const totalWords = asrData.split(' ').length;
    const percentChange = (totalChanges / totalWords) * 100;
    logger.info(
        `Total changes: ${totalChanges} = ${totalAdditions} additions + ${totalRemovals} removals` +
        `\nTotal words: ${totalWords}` +
        `\nPercent change: ${percentChange.toFixed(2)}% - diff_change_pc_threshold : ${config.qc.diff_change_pc_threshold}%`,
    );
    let qcPassed = false;
    let details = '';
    if (percentChange < config.qc.diff_change_pc_threshold) {
        qcPassed = false;
        details = `Differences between asr and qc file ${percentChange} < Difference Change Threshold ${config.qc.diff_change_pc_threshold}`;
    } else {
        qcPassed = true;
        details = `Differences between asr and qc file ${percentChange} > Difference Change Threshold ${config.qc.diff_change_pc_threshold}`;
    }
    logger.info(`<-- qualityCriteriaPassed ${fileId} - ${qcPassed}`);
    return { result: qcPassed, details: details };
}
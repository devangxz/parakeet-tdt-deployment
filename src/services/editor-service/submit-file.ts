// import { FileTag, Order, OrderStatus } from '@prisma/client'
// import { diffWords } from 'diff'

// import config from '../../../config.json'
// import { FILE_CACHE_URL } from '@/constants'
// import logger from '@/lib/logger'
// import prisma from '@/lib/prisma'
// import axiosInstance from '@/utils/axios'
// import { getFileVersionFromS3 } from '@/utils/backend-helper'
// import getCustomerTranscript from '@/utils/getCustomerTranscript'

// async function qualityCriteriaPassed(
//     fileId: string,
// ): Promise<{ result: boolean; details: string }> {
//     logger.info(`--> qualityCriteriaPassed ${fileId}`);

//     // Calculate the diff will be between the <fileId>_asr.txt and the <fileId>_qc.txt.

//     const ASRFileVersion = await prisma.fileVersion.findFirst({
//         where: {
//             fileId,
//             tag: FileTag.AUTO
//         },
//         select: {
//             s3VersionId: true
//         }
//     })

//     if (!ASRFileVersion || !ASRFileVersion.s3VersionId) {
//         throw new Error(`File version for ASR not found for file ${fileId}`);
//     }

//     const filename = `${fileId}.txt`;
//     const asrData = (await getFileVersionFromS3(filename, ASRFileVersion?.s3VersionId)).toString();
//     if (!asrData) {
//         throw new Error('Transcript not found');
//     }

//     const QCFileVersion = await prisma.fileVersion.findFirst({
//         where: {
//             fileId,
//             tag: FileTag.QC_DELIVERED
//         },
//         select: {
//             s3VersionId: true
//         }
//     })

//     if (!QCFileVersion || !QCFileVersion.s3VersionId) {
//         throw new Error(`File version for QC not found for file ${fileId}`);
//     }

//     const qcData = (await getFileVersionFromS3(filename, QCFileVersion?.s3VersionId)).toString();

//     if (!qcData) {
//         throw new Error('Transcript not found');
//     }

//     const diff = diffWords(asrData, qcData);

//     let totalAdditions = 0;
//     let totalRemovals = 0;
//     diff.forEach((change: { added?: boolean; removed?: boolean }) => {
//         if (change.added) {
//             totalAdditions += 1;
//         } else if (change.removed) {
//             totalRemovals += 1;
//         }
//     });

//     const totalChanges = totalAdditions + totalRemovals;
//     const totalWords = asrData.split(' ').length;
//     const percentChange = (totalChanges / totalWords) * 100;
//     logger.info(
//         `Total changes: ${totalChanges} = ${totalAdditions} additions + ${totalRemovals} removals` +
//         `\nTotal words: ${totalWords}` +
//         `\nPercent change: ${percentChange.toFixed(2)}% - diff_change_pc_threshold : ${config.qc.diff_change_pc_threshold}%`,
//     );
//     let qcPassed = false;
//     let details = '';
//     if (percentChange < config.qc.diff_change_pc_threshold) {
//         qcPassed = false;
//         details = `Differences between asr and qc file ${percentChange} < Difference Change Threshold ${config.qc.diff_change_pc_threshold}`;
//     } else {
//         qcPassed = true;
//         details = `Differences between asr and qc file ${percentChange} > Difference Change Threshold ${config.qc.diff_change_pc_threshold}`;
//     }
//     logger.info(`<-- qualityCriteriaPassed ${fileId} - ${qcPassed}`);
//     return { result: qcPassed, details: details };
// }

// const calculateTranscriberCost = async (order: any, transcriberId: number) => {
//     const duration = +(order.File.duration / 3600).toFixed(2);
//     const pwerLevel: 'high' | 'medium' | 'low' =
//         order.pwer <= config.pwerRateMap.low
//             ? 'low'
//             : order.pwer <= config.pwerRateMap.medium
//                 ? 'medium'
//                 : 'high';
//     let rate = 0;
//     const transcriptionRates = config.transcriber_rates;
//     const userRates = await helper.getCustomerRate(order.userId);
//     const qcStatuses = [OrderStatus.QC_ASSIGNED, OrderStatus.TRANSCRIBED];
//     const reviewStatuses = [
//         OrderStatus.QC_COMPLETED,
//         OrderStatus.REVIEWER_ASSIGNED,
//         OrderStatus.FORMATTED,
//         OrderStatus.REVIEW_COMPLETED,
//         OrderStatus.FINALIZER_ASSIGNED,
//     ];
//     const iCQC = await JobTable.isTranscriberICQC(transcriberId);

//     if (qcStatuses.includes(order.status)) {
//         rate = iCQC.isICQC
//             ? iCQC.qcRate
//             : userRates && userRates.option?.toLocaleLowerCase() === 'legal'
//                 ? transcriptionRates.legal_qc[pwerLevel]
//                 : transcriptionRates.general_qc[pwerLevel];
//     } else if (reviewStatuses.includes(order.status)) {
//         rate = iCQC.isICQC
//             ? iCQC.cfRRate
//             : userRates
//                 ? (pwerLevel === 'high'
//                     ? userRates.reviewerHighDifficultyRate
//                     : pwerLevel === 'medium'
//                         ? userRates.reviewerMediumDifficultyRate
//                         : userRates.reviewerLowDifficultyRate) * 60
//                 : 0;
//     }

//     const totalRate = rate + order.rateBonus;
//     const cost = +(totalRate * duration).toFixed(2);

//     return {
//         cost,
//         rate: rate.toFixed(2),
//     };
// };

// export async function submitFile(orderId: number, transcriberId: number, transcript: string) {
//     try {

//         const order = await prisma.order.findUnique({
//             where: {
//                 id: orderId,
//             },
//             include: {
//                 File: true,
//             },
//         })

//         if (!order) {
//             logger.error(`No order found with the given order ID ${orderId}`)
//             return {
//                 success: false,
//                 message: 'Order not found',
//             }
//         }

//         await axiosInstance.post(`${FILE_CACHE_URL}/save-transcript`, {
//             body: JSON.stringify({
//                 fileId: order.fileId,
//                 transcript: transcript,
//                 userId: transcriberId
//             })
//         })

//         const customerTranscript = await getCustomerTranscript(
//             order.fileId,
//             transcript,
//         );

//         await axiosInstance.post(`${FILE_CACHE_URL}/save-transcript`, {
//             method: 'POST',
//             body: JSON.stringify({
//                 fileId: order.fileId,
//                 transcript: customerTranscript,
//                 userId: order.userId,
//             })
//         })

//         const testResult = await qualityCriteriaPassed(order.fileId);

//         if (testResult.result === false) {
//             logger.info(`Quality Criteria failed ${order.fileId}`);

//             const qcCost = await calculateTranscriberCost(order, transcriberId);

//             await prisma.$transaction(async (prisma) => {
//                 await OrderTable.update(order.id, {
//                     reportMode: ReportMode.AUTO,
//                     reportOption: ReportOption.AUTO_DIFF_BELOW_THRESHOLD,
//                     reportComment: testResult.details,
//                     status: OrderStatus.SUBMITTED_FOR_APPROVAL,
//                 });
//                 // QC's Earnings is not updated here. It will be updated only when the OM approves
//                 await prisma.jobAssignment.updateMany({
//                     where: {
//                         orderId: order.id,
//                         transcriberId,
//                         type: JobType.QC,
//                         status: JobStatus.ACCEPTED,
//                     },
//                     data: {
//                         status: JobStatus.SUBMITTED_FOR_APPROVAL,
//                         earnings: qcCost.cost,
//                         completedTs: new Date(),
//                     },
//                 });
//             });
//             logger.info(
//                 `<-- OrderTranscriptionFlow:submitQC - OrderStatus.SUBMITTED_FOR_APPROVAL`,
//             );
//             return;
//         }

//     } catch (error) {
//         logger.error(`Failed to fetch ${status} files:`, error)
//         return {
//             success: false,
//             message: 'Failed to fetch files',
//         }
//     }

// }

export async function submitFile(orderId: number, transcriberId: number, transcript: string) {
    console.log(orderId, transcriberId, transcript)
}
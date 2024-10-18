"use strict";
// import { FileTag, Order, OrderStatus } from '@prisma/client'
// import { diffWords } from 'diff'
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitFile = void 0;
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
function submitFile(orderId, transcriberId, transcript) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log(orderId, transcriberId, transcript);
            return [2 /*return*/];
        });
    });
}
exports.submitFile = submitFile;

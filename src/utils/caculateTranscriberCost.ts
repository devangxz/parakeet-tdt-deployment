import { File, Order } from "@prisma/client";

import { getCustomerRate, isTranscriberICQC } from "./backend-helper";
import config from '../../config.json'

type OrderWithFileData = Order & {
    File: File | null;
} | null;

export default async function calculateTranscriberCost(order: OrderWithFileData, transcriberId: number) {
    if (!order || !order.File) { throw new Error('Order or File not found') }

    const duration = +(order.File.duration / 3600).toFixed(2);
    const pwerLevel: 'high' | 'medium' | 'low' =
        order.pwer !== null && order.pwer <= config.pwerRateMap.low
            ? 'low'
            : order.pwer !== null && order.pwer <= config.pwerRateMap.medium
                ? 'medium'
                : 'high';
    let rate = 0;
    const transcriptionRates = config.transcriber_rates;
    const userRates = await getCustomerRate(order.userId);
    const qcStatuses = ['QC_ASSIGNED', 'TRANSCRIBED'];

    const reviewStatuses = [
        'QC_COMPLETED',
        'REVIEWER_ASSIGNED',
        'FORMATTED',
        'REVIEW_COMPLETED',
        'FINALIZER_ASSIGNED',
    ];
    const iCQC = await isTranscriberICQC(transcriberId);

    if (qcStatuses.includes(order.status)) {
        rate = iCQC.isICQC
            ? iCQC.qcRate
            : userRates && userRates.option?.toLocaleLowerCase() === 'legal'
                ? transcriptionRates.legal_qc[pwerLevel]
                : transcriptionRates.general_qc[pwerLevel];
    } else if (reviewStatuses.includes(order.status)) {
        rate = iCQC.isICQC
            ? iCQC.cfRRate
            : userRates
                ? (pwerLevel === 'high'
                    ? userRates.reviewerHighDifficultyRate
                    : pwerLevel === 'medium'
                        ? userRates.reviewerMediumDifficultyRate
                        : userRates.reviewerLowDifficultyRate) * 60
                : 0;
    }

    const totalRate = rate + order.rateBonus;
    const cost = +(totalRate * duration).toFixed(2);

    return {
        cost,
        rate: rate.toFixed(2),
    };
};

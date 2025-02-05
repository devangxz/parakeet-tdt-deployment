/* eslint-disable @typescript-eslint/no-explicit-any */
import { OrderStatus } from '@prisma/client'

import { isTranscriberICQC, getCustomerRate } from './backend-helper'
import config from '../../config.json'

const calculateTranscriberCost = async (order: any, transcriberId: number) => {
  const duration = +(order.File.duration / 3600).toFixed(2)
  const pwerLevel: 'high' | 'medium' | 'low' =
    order.pwer <= config.pwerRateMap.low
      ? 'low'
      : order.pwer <= config.pwerRateMap.medium
      ? 'medium'
      : 'high'
  let rate = 0
  const transcriptionRates = config.transcriber_rates
  const userRates = await getCustomerRate(order.userId)
  const qcStatuses = [OrderStatus.QC_ASSIGNED, OrderStatus.TRANSCRIBED]
  const reviewStatuses = [
    OrderStatus.QC_COMPLETED,
    OrderStatus.REVIEWER_ASSIGNED,
    OrderStatus.FORMATTED,
    OrderStatus.REVIEW_COMPLETED,
    OrderStatus.FINALIZER_ASSIGNED,
  ]
  const iCQC = await isTranscriberICQC(transcriberId)

  if (qcStatuses.includes(order.status)) {
    if (iCQC.isICQC) {
      rate = iCQC.qcRate
    } else if (userRates) {
      rate =
        pwerLevel === 'high'
          ? userRates.qcHighDifficultyRate
          : pwerLevel === 'medium'
          ? userRates.qcMediumDifficultyRate
          : userRates.qcLowDifficultyRate
    } else {
      rate = transcriptionRates.general_qc[pwerLevel]
    }
  } else if (reviewStatuses.includes(order.status)) {
    rate = iCQC.isICQC
      ? iCQC.cfRRate
      : userRates
      ? pwerLevel === 'high'
        ? userRates.reviewerHighDifficultyRate
        : pwerLevel === 'medium'
        ? userRates.reviewerMediumDifficultyRate
        : userRates.reviewerLowDifficultyRate
      : 0
  }

  const totalRate = rate + order.rateBonus
  const cost = +(totalRate * duration).toFixed(2)

  return {
    cost,
    rate: rate.toFixed(2),
  }
}

export default calculateTranscriberCost

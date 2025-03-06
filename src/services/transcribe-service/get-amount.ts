/* eslint-disable @typescript-eslint/no-explicit-any */
import { OrderStatus } from '@prisma/client'

import config from '../../../config.json'
import prisma from '@/lib/prisma'
import { isTranscriberICQC, getCustomerRate } from '@/utils/backend-helper'

const calculateAssignmentAmount = async (
  orderId: number,
  transcriberId: number,
  orderStatus: OrderStatus
) => {
  const order: any = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      File: true,
    },
  })

  if (!order) {
    return {
      cost: 0,
      rate: 0,
    }
  }

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
  const cfReviewStatuses = [
    OrderStatus.QC_COMPLETED,
    OrderStatus.REVIEWER_ASSIGNED,
    OrderStatus.FORMATTED,
  ]
  const reviewStatuses = [
    OrderStatus.REVIEW_COMPLETED,
    OrderStatus.FINALIZER_ASSIGNED,
    OrderStatus.FINALIZING_COMPLETED,
  ]
  const iCQC = await isTranscriberICQC(transcriberId)

  if (qcStatuses.includes(orderStatus as (typeof qcStatuses)[number])) {
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
  } else if (
    cfReviewStatuses.includes(orderStatus as (typeof cfReviewStatuses)[number])
  ) {
    rate = iCQC.isICQC
      ? iCQC.cfRate
      : userRates
      ? pwerLevel === 'high'
        ? userRates.cfReviewHighDifficultyRate
        : pwerLevel === 'medium'
        ? userRates.cfReviewMediumDifficultyRate
        : userRates.cfReviewLowDifficultyRate
      : 0
  } else if (
    reviewStatuses.includes(orderStatus as (typeof reviewStatuses)[number])
  ) {
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

export default calculateAssignmentAmount

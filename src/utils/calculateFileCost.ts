/* eslint-disable @typescript-eslint/no-explicit-any */
import { OrderType } from '@prisma/client'

import config from '../../config.json'
import { getCustomerRate } from '@/utils/backend-helper'

const calculateFileCost = async (order: any) => {
  const duration = +(order.File.duration / 3600).toFixed(2)
  const pwerLevel: 'high' | 'medium' | 'low' =
    order.pwer <= config.pwerRateMap.low
      ? 'low'
      : order.pwer <= config.pwerRateMap.medium
      ? 'medium'
      : 'high'
  const transcriptionRates = config.transcriber_rates
  const userRates = await getCustomerRate(order.userId)

  const rates = {
    transcription:
      userRates && userRates.option?.toLocaleLowerCase() === 'legal'
        ? transcriptionRates.legal_qc[pwerLevel]
        : transcriptionRates.general_qc[pwerLevel],
    bonus: order.rateBonus,
    customFormat: 0,
  }

  if (order.orderType === OrderType.TRANSCRIPTION_FORMATTING) {
    rates.customFormat = userRates
      ? pwerLevel === 'high'
        ? userRates.reviewerHighDifficultyRate
        : pwerLevel === 'medium'
        ? userRates.reviewerMediumDifficultyRate
        : userRates.reviewerLowDifficultyRate
      : 0
  }
  const transcriptionRate = rates.transcription + order.rateBonus
  const customFormatRate = rates.customFormat + order.rateBonus
  const transcriptionCost = +(transcriptionRate * duration).toFixed(2)
  const customFormatCost = +(customFormatRate * duration).toFixed(2)

  return {
    transcriptionRate: rates.transcription.toFixed(2),
    transcriptionCost,
    customFormatRate: rates.customFormat.toFixed(2),
    customFormatCost,
  }
}

export default calculateFileCost

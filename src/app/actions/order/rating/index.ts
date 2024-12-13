'use server'

import { Rating } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getOrderRating(fileId: string) {
  try {
    const ratingMap: { [key in Rating]: number } = {
      [Rating.POOR]: 1,
      [Rating.BAD]: 2,
      [Rating.OKAY]: 3,
      [Rating.GOOD]: 4,
      [Rating.EXCELLENT]: 5,
    }

    const order = await prisma.order.findUnique({
      where: { fileId },
      select: { rating: true },
    })

    if (!order) {
      logger.error(`Order not found for file: ${fileId}`)
      return {
        success: false,
        message: 'Order not found.',
      }
    }

    logger.info(`Retrieved rating for order: ${fileId}`)
    if (order.rating) {
      return {
        success: true,
        rating: ratingMap[order.rating],
      }
    }

    return {
      success: false,
      message: 'No rating found for order.',
    }
  } catch (err) {
    logger.error(`Error getting order rating for file ${fileId}: ${err}`)
    return {
      success: false,
      message: 'Error getting order rating',
    }
  }
}

export async function updateOrderRating(fileId: string, rating: number) {
  try {
    const ratingMap: { [key: number]: Rating } = {
      1: Rating.POOR,
      2: Rating.BAD,
      3: Rating.OKAY,
      4: Rating.GOOD,
      5: Rating.EXCELLENT,
    }

    if (!(rating in ratingMap)) {
      return {
        success: false,
        message: 'Invalid rating value',
      }
    }

    const mapRating = ratingMap[rating]
    const orderExist = await prisma.order.update({
      where: { fileId },
      data: {
        rating: mapRating,
      },
    })

    if (!orderExist) {
      logger.error(`Order not found for file: ${fileId}`)
      return {
        success: false,
        message: 'Order not found.',
      }
    }

    logger.info(`Updated rating for order: ${fileId}`)
    return {
      success: true,
      message: 'Thank you for the feedback',
    }
  } catch (err) {
    logger.error(`Error updating order rating for file ${fileId}: ${err}`)
    return {
      success: false,
      message: 'Cannot submit your feedback',
    }
  }
}

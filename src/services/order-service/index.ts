import { InvoiceStatus, InvoiceType, OrderType } from '@prisma/client'

import {
  ORDER_TYPES,
  FILE_UPLOAD_LIMIT_IN_HOUR,
  VERBATIM_PRICE,
  RUSH_PRICE,
} from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import {
  getOrderOptions,
  generateInvoiceId,
  getTeamSuperAdminUserId,
  getRate,
  getUserRate,
  getDiscountRate,
} from '@/utils/backend-helper'

type Files = {
  filename: string
  fileId: string
  duration: number
  price: number
}

const calculatePrice = (duration: number, rate: number) =>
  Math.round(((duration * rate) / 60) * 100) / 100

export const orderFiles = async (
  userId: number,
  internalTeamUserId: number | null,
  fileIds: string[],
  orderType: string,
  customPlan: boolean
) => {
  const options = await getOrderOptions(userId)

  if (!ORDER_TYPES.includes(orderType)) {
    logger.error(
      `Invalid order type ${orderType} for filed ${fileIds.join(
        ','
      )} by ${userId}`
    )
    return {
      success: false,
      message: 'Invalid order type',
    }
  }

  // Delete any pending transcript invoices for the files
  await prisma.invoice.deleteMany({
    where: {
      itemNumber: fileIds.join(','),
      type: InvoiceType.TRANSCRIPT,
      status: InvoiceStatus.PENDING,
      userId: userId,
    },
  })

  // Delete any pending transcript invoice files for the files
  await prisma.invoiceFile.deleteMany({
    where: {
      fileId: {
        in: fileIds,
      },
    },
  })

  const files: Files[] = []

  for (const fileId of fileIds) {
    try {
      const fileWithOrder = await prisma.file.findUnique({
        where: { fileId },
        include: { Orders: true },
      })

      if (!fileWithOrder) {
        logger.error(`file not found for ${fileId}, ${userId}`)
        return {
          success: false,
          message: 'File not found',
        }
      }

      if (
        fileWithOrder.Orders.length === 0 ||
        fileWithOrder.Orders.every((order) =>
          ['REJECTED', 'CANCELLED', 'REFUNDED'].includes(order.status)
        )
      ) {
        files.push({
          filename: fileWithOrder.filename ?? '',
          fileId: fileId,
          duration: fileWithOrder.duration ?? 0,
          price: 0,
        })
      } else {
        fileWithOrder.Orders.forEach((order) => {
          if (!['REJECTED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
            logger.error(`file already ordered ${fileId}, ${userId}`)
          }
        })
      }

      if (fileWithOrder.duration > 3600 * FILE_UPLOAD_LIMIT_IN_HOUR) {
        logger.error(
          `attempt to order 10 hour plus file, ${fileWithOrder.duration}, ${userId}`
        )
        return {
          success: false,
          message:
            'Files cannot be longer than 10 hours. Please try trimming it.',
        }
      }
    } catch (error) {
      logger.error(`Failed to fetch file ${fileId}`, error)
      return {
        success: false,
        message: 'An error occurred. Please try again after some time.',
      }
    }
  }

  if (files.length === 0) {
    logger.error(`file's not found for ${userId}`)
    return {
      success: false,
      message: 'No valid files found.',
    }
  }

  const invoiceId = generateInvoiceId('CGT')
  let totalPrice = 0
  const filesInfo: Files[] = []
  const teamAdminUserId = await getTeamSuperAdminUserId(
    internalTeamUserId,
    userId
  )
  const rate = await getRate(teamAdminUserId, customPlan)
  let rates = {
    vb: VERBATIM_PRICE,
    ro: RUSH_PRICE,
  }
  let customFormattingRate = 0

  const customPlanRates = await getUserRate(teamAdminUserId)
  if (!customPlanRates) {
    rates = {
      vb: VERBATIM_PRICE,
      ro: RUSH_PRICE,
    }
  } else {
    rates = {
      vb: customPlanRates.sv,
      ro: customPlanRates.ro,
    }
  }

  if (!rate || !options) {
    logger.error(`Failed to fetch rate or options for ${userId}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }

  for (const file of files) {
    let price = calculatePrice(file.duration, rate)

    if (orderType === OrderType.TRANSCRIPTION_FORMATTING) {
      const customPlanRates = await getUserRate(teamAdminUserId)
      if (!customPlanRates) {
        logger.error(`Failed to fetch custom plan rates for ${teamAdminUserId}`)
        return {
          success: false,
          message: 'An error occurred. Please try again after some time.',
        }
      }
      rates = {
        vb: customPlanRates.sv,
        ro: customPlanRates.ro,
      }
      price += calculatePrice(file.duration, customPlanRates.cf)
      customFormattingRate = customPlanRates.cf
    }

    // Calculate additional costs based on selected options
    if (options.vb === 1) {
      price += calculatePrice(file.duration, rates.vb)
    }
    if (options.exd === 1) {
      price += calculatePrice(file.duration, rates.ro)
    }

    filesInfo.push({
      filename: file.filename,
      fileId: file.fileId,
      duration: file.duration,
      price: price,
    })

    totalPrice += price
  }

  const discountRate = await getDiscountRate(teamAdminUserId)
  const discount = (totalPrice * discountRate).toFixed(2)
  const itemNumber = files.map((file) => file.fileId).join(',')
  const instruction = await prisma.defaultInstruction.findUnique({
    where: {
      userId: userId,
    },
    select: {
      instructions: true,
    },
  })

  const invoiceData = {
    invoiceId,
    type: InvoiceType.TRANSCRIPT,
    userId,
    amount: Number(totalPrice.toFixed(2)),
    discount: Number(discount),
    itemNumber,
    options: JSON.stringify(options),
    instructions: instruction?.instructions ?? '',
    orderRate: Number((rate + customFormattingRate).toFixed(2)),
  }

  const invoice = await prisma.invoice.create({
    data: invoiceData,
  })

  if (!invoice) {
    logger.error(`Failed to create invoice ${invoiceId}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }

  for (const file of filesInfo) {
    await prisma.invoiceFile.create({
      data: {
        invoiceId: invoiceId,
        fileId: file.fileId,
        price: file.price,
      },
    })
  }

  logger.info(`Order created for ${invoiceId} for ${userId}`)
  return {
    success: true,
    message: 'Order created successfully',
    inv: invoiceId,
    totalAmount: totalPrice,
    rates,
  }
}

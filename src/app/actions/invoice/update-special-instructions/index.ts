'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface UpdateSpecialInstructionsParams {
  invoiceId: string
  instructions: string
}

export async function updateSpecialInstructions({
  invoiceId,
  instructions,
}: UpdateSpecialInstructionsParams) {
  try {
    if (!invoiceId) {
      return {
        success: false,
        message: 'Invoice ID is required',
      }
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return {
        success: false,
        message: 'Invoice not found',
      }
    }

    await prisma.invoice.update({
      where: {
        invoiceId,
      },
      data: {
        instructions,
      },
    })

    if (invoice.itemNumber) {
      const fileIds = invoice.itemNumber.split(',')

      for (const fileId of fileIds) {
        await prisma.order.updateMany({
          where: {
            fileId,
          },
          data: {
            instructions,
            updatedAt: new Date(),
          },
        })
      }
    }

    logger.info(`Updated special instructions for invoice ${invoiceId}`)

    return {
      success: true,
      message: 'Instructions updated successfully',
    }
  } catch (error) {
    logger.error(
      `Error updating special instructions for invoice ${invoiceId}:`,
      error
    )
    return {
      success: false,
      message: 'Failed to update instructions',
    }
  }
}

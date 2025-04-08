'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getFormattingOptionsAction(orderId: number) {
  try {
    const DEFAULT_TEMPLATE = { name: 'Scribie Single Line Spaced', id: 1 }

    if (!orderId) {
      logger.error(`Missing orderId parameter`)
      return { success: false, error: 'Missing orderId parameter' }
    }

    const order = await prisma.order.findUnique({
      where: {
        id: Number(orderId),
      },
      select: {
        fileId: true,
      },
    })

    if (!order) {
      logger.error(`Order not found for ${orderId}`)
      return { success: false, error: 'Order not found' }
    }

    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: {
        fileId: order.fileId,
      },
      select: {
        invoiceId: true,
      },
    })

    if (!invoiceFile) {
      logger.error(`Invoice not found for file ${order.fileId}`)
      return { success: false, error: 'Invoice not found' }
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceFile.invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found for file ${order.fileId}`)
      return { success: false, error: 'Invoice not found' }
    }

    const options = JSON.parse(invoice.options ?? '{}')
    const templateId = options.tmp !== undefined ? options.tmp : null

    logger.info(
      `Template ID: ${templateId}, options: ${JSON.stringify(
        options
      )}, fileId: ${order.fileId}`
    )

    if (templateId !== 0) {
      logger.info(`Template ID: ${templateId} fileId: ${order.fileId}`)
      if (templateId === null || templateId === undefined) {
        logger.error(`Template not found for file ${order.fileId}`)
        return { success: false, error: 'Template not found' }
      }
    }

    const allPublicTemplates = await prisma.template.findMany({
      where: {
        userId: {
          equals: null,
        },
      },
      select: { name: true, id: true },
    })

    const currentTemplate = allPublicTemplates.find(
      (template) => template.id === templateId
    )

    return {
      success: true,
      options,
      templates: allPublicTemplates,
      currentTemplate: currentTemplate ?? DEFAULT_TEMPLATE,
    }
  } catch (err) {
    logger.error(
      `An error occurred while fetching order option for order ${orderId}: ${
        (err as Error).message
      }`
    )
    return {
      success: false,
      error: 'Failed to fetch order options',
    }
  }
}

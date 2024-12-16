'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface SpeakerName {
  [key: string]: string
}

export async function updateSpeakerNameAction(
  fileId: string,
  speakerName: SpeakerName
) {
  try {
    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: {
        fileId: fileId,
      },
      select: {
        invoiceId: true,
      },
    })

    if (!invoiceFile) {
      logger.error(`Invoice not found for file ${fileId}`)
      return {
        success: false,
        error: 'Invoice not found',
      }
    }

    const speakerObjects = Object.entries(speakerName).map(([, value]) => {
      const [firstName, ...lastNameParts] = value.trim().split(' ')
      const lastName = lastNameParts.join(' ')
      return {
        fn: firstName || '',
        ln: lastName || '',
      }
    })

    const currentInvoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceFile.invoiceId,
      },
      select: {
        options: true,
      },
    })

    if (!currentInvoice) {
      logger.error(`Invoice not found for file ${fileId}`)
      return {
        success: false,
        error: 'Invoice not found',
      }
    }

    const currentOptions = JSON.parse(currentInvoice.options || '{}')
    const updatedOptions = {
      ...currentOptions,
      sn: {
        ...currentOptions.sn,
        [fileId]: speakerObjects,
      },
    }

    await prisma.invoice.update({
      where: {
        invoiceId: invoiceFile.invoiceId,
      },
      data: {
        options: JSON.stringify(updatedOptions),
      },
    })

    return {
      success: true,
      message: 'Successfully updated speaker name',
    }
  } catch (error) {
    logger.error(error)
    return {
      success: false,
      error: 'Failed to update speaker name',
    }
  }
}

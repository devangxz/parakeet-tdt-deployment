import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export default async function getOrderType(
  fileId: string,
  type: string
): Promise<string> {
  try {
    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: { fileId },
    })
    if (!invoiceFile) return type

    const invoice = await prisma.invoice.findFirst({
      where: { invoiceId: invoiceFile.invoiceId },
    })

    if (!invoice) return type

    const options = JSON.parse(invoice.options ?? '{}') as {
      exd?: number
    } | null
    if (options?.exd === 1) return 'RUSH'
    if (type === 'TRANSCRIPTION') return 'TRANSCRIPTION'
    if (type === 'TRANSCRIPTION_FORMATTING') return 'CF'

    return type
  } catch (error) {
    logger.error(`Error while determining order type for file ${fileId}`, error)
    return type
  }
}

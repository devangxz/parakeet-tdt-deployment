import { OrderStatus, Order, FileTag } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { sendTemplateMail, getAWSSesInstance } from '@/lib/ses'
import { checkOrderWatch, deleteFileVersionFromS3 } from '@/utils/backend-helper'

async function getPaidByUserId(fileId: string) {
  logger.info(`--> getPaidByUserId ${fileId}`)
  try {
    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: {
        fileId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceFile?.invoiceId,
      },
    })

    logger.info(`<-- getPaidByUserId ${fileId}`)
    return invoice?.paidBy
  } catch (err) {
    logger.error((err as Error).message)
    throw new Error()
  }
}

async function deliver(order: Order, transcriberId: number) {
  logger.info(`--> deliver ${order.id} ${order.fileId}`)
  try {
    // Check if CUSTOMER_EDIT exists for this file
    const customerEdit = await prisma.fileVersion.findFirst({
      where: {
        fileId: order.fileId,
        tag: FileTag.CUSTOMER_EDIT,
      },
    });

    if (customerEdit && customerEdit.s3VersionId) {
      logger.info(`Found CUSTOMER_EDIT for ${order.fileId} on deliver, deleting file version`);
      // Delete the file version from S3
      try {
        await deleteFileVersionFromS3(order.fileId, customerEdit.s3VersionId);
        logger.info(`Deleted customer edit file from S3 for ${order.fileId}`);
      } catch (s3Error) {
        logger.error(`Failed to delete customer edit file from S3: ${(s3Error as Error).message}`);
      }
      await prisma.fileVersion.delete({
        where: {
          id: customerEdit.id,
        },
      });
      logger.info(`Deleted CUSTOMER_EDIT record from database for ${order.fileId}`);
    }
  } catch (error) {
    logger.error(`Error handling customer edit cleanup: ${(error as Error).message}`);
    // Continue with delivery process even if cleanup fails
  }
  await prisma.order.update({
    where: { id: order.id },
    data: {
      deliveredTs: new Date(),
      deliveredBy: transcriberId,
      status: OrderStatus.DELIVERED,
      updatedAt: new Date(),
    },
  })
  const file = await prisma.file.findUnique({
    where: { fileId: order.fileId },
  })

  const paidBy = await getPaidByUserId(order.fileId)

  const isCustomerOnWatchlist = await checkOrderWatch(order.userId)

  if (isCustomerOnWatchlist) {
    const userEmail = await prisma.user.findUnique({
      where: { id: order.userId },
    })
    const awsSes = getAWSSesInstance()
    await awsSes.sendAlert(
      `Watchlist Customer Delivery`,
      `${userEmail?.email ?? ''} file was just delivered, ${order.fileId}`,
      'software'
    )
  }

  const templateData = {
    transcript_name: file?.filename || '',
    check_and_download: `https://${process.env.SERVER}/files/permalink/${file?.fileId}`,
  }

  await sendTemplateMail(
    'ORDER_PROCESSED',
    order.userId,
    templateData,
    paidBy ?? 0
  )
  logger.info(`<-- deliver ${order.id} ${order.fileId}`)
}

export default deliver

import crypto from 'crypto'
import { Readable } from 'stream'

import {
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import paypal, {
  RecipientType,
  CreatePayoutRequestBody,
  PayoutItem,
} from '@paypal/payouts-sdk'
import {
  TeamMemberRole,
  InvoiceType,
  InvoiceStatus,
  Role,
  PaymentMethod,
  QCType,
  JobStatus,
  WithdrawalStatus,
} from '@prisma/client'

import config from '../../config.json'
import { DEFAULT_ORDER_OPTIONS, RATES } from '../constants'
import gateway from '../lib/braintree'
import logger from '../lib/logger'
import paypalClient from '../lib/paypal'
import prisma from '../lib/prisma'
import s3Client from '../lib/s3-client'

export const getOrderOptions = async (userId: number) => {
  let options = DEFAULT_ORDER_OPTIONS
  try {
    const result = await prisma.defaultOption.findUnique({
      where: { userId: userId },
    })

    if (result && result.options) {
      options = { ...options, ...JSON.parse(result.options) }
    }
    logger.info(`Order options for user ${userId}:`, options)
    return options
  } catch (error) {
    logger.error('Failed to get order options:', error)
    return null
  }
}

export const generateInvoiceId = (prefix: string) => {
  const uniqueId = crypto.randomBytes(8).toString('hex')
  return `${prefix}${uniqueId.toUpperCase()}`
}

export const getTeamAdminUserDetails = async (internalAdminUserId: number) => {
  try {
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: internalAdminUserId,
        role: TeamMemberRole.INTERNAL_TEAM_USER,
      },
    })

    if (!teamMember) {
      logger.info(
        `No team found with the given internal admin user ID ${internalAdminUserId}`
      )
      return false
    }

    const adminTeamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamMember.teamId,
        role: TeamMemberRole.SUPER_ADMIN,
      },
      include: {
        user: true,
      },
    })

    if (!adminTeamMember) {
      logger.error(`No admin found for the team ${teamMember.teamId}`)
      return false
    }

    return {
      email: adminTeamMember.user.email,
      userId: adminTeamMember.userId,
    }
  } catch (err) {
    logger.error('Failed to get team admin user details:', err)
    return false
  }
}

export const getTeamSuperAdminUserId = async (
  internalTeamUserId: number | null,
  userId: number
) => {
  const teamAdminDetails = internalTeamUserId
    ? await getTeamAdminUserDetails(internalTeamUserId)
    : null
  if (teamAdminDetails) {
    return teamAdminDetails.userId
  } else {
    return userId
  }
}

export const getUserRate = async (userId: number) => {
  try {
    const userRate = await prisma.userRate.findUnique({
      where: {
        userId,
      },
    })

    if (!userRate) {
      logger.info(`No rates found for user ID ${userId}`)
      return false
    }

    logger.info(`User rates for user ID ${userId}:`, userRate)

    return {
      manual: userRate.manualRate,
      sv: userRate.svRate,
      ac: userRate.addChargeRate,
      atc: userRate.audioTimeCoding,
      ro: userRate.rushOrder || 0,
      cf: userRate.customFormat,
      cf_deadline: userRate.deadline,
    }
  } catch (error) {
    logger.error('Failed to fetch user rates:', error)
    return false
  }
}

export const getRate = async (userId: number, customPlan: boolean) => {
  const rateIndex = 1
  if (customPlan) {
    const rate = await getUserRate(userId)
    if (!rate) {
      return false
    }
    return rate.manual
  } else {
    return RATES[rateIndex].price
  }
}

export const getDiscountRate = async (userId: number) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: {
        userId,
      },
    })

    if (!customer) {
      logger.error(`No customer entry found for ${userId}`)
      return 0
    }

    logger.info(`Discount rate for user ID ${userId}:`, customer.discountRate)
    return customer.discountRate
  } catch (error) {
    logger.error('Failed to fetch discount rate:', error)
    return 0
  }
}

export const checkBraintreeCustomer = async (userId: number) => {
  try {
    const braintreeCustomer = await gateway.customer.find(userId.toString())
    if (braintreeCustomer) {
      return true
    }
    return false
  } catch (err) {
    return false
  }
}

export const getCreditsPreferences = async (userId: number) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: {
        userId,
      },
    })

    if (!customer) {
      return false
    }

    return customer.useCreditsDefault
  } catch (err) {
    return false
  }
}

export const getCreditsBalance = async (userId: number) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        type: {
          in: [
            InvoiceType.TRANSCRIPT,
            InvoiceType.ADDL_FORMATTING,
            InvoiceType.ADDL_PROOFREADING,
            InvoiceType.ADD_CREDITS,
            InvoiceType.FREE_CREDITS,
            InvoiceType.FORMATTING,
            InvoiceType.DEPRECATED,
          ],
        },
        status: {
          in: [InvoiceStatus.PAID, InvoiceStatus.BILLED],
        },
      },
    })

    const creditsBalance = invoices.reduce((acc, invoice) => {
      if (['ADD_CREDITS', 'FREE_CREDITS'].includes(invoice.type)) {
        return acc + (invoice.amount - invoice.refundAmount)
      } else {
        return acc + (invoice.creditsRefunded - invoice.creditsUsed)
      }
    }, 0)

    const roundedCreditsBalance = Math.round(creditsBalance * 100) / 100
    return roundedCreditsBalance || 0
  } catch (err) {
    return 0
  }
}

export const applyCredits = async (invoiceId: string, userId: number) => {
  try {
    const creditsBalance = await getCreditsBalance(userId)

    if (creditsBalance <= 0) {
      await prisma.invoice.update({
        where: {
          invoiceId,
        },
        data: {
          creditsUsed: 0,
        },
      })
      return false
    }
    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId,
      },
    })

    if (!invoice) {
      return false
    }

    const total = (invoice.amount - invoice.discount).toFixed(2)
    const creditsUsed =
      creditsBalance >= parseFloat(total) ? parseFloat(total) : creditsBalance

    await prisma.invoice.update({
      where: {
        invoiceId,
      },
      data: {
        creditsUsed: Number(creditsUsed.toFixed(2)),
      },
    })

    return creditsUsed
  } catch (err) {
    return false
  }
}

export const generateUniqueTransactionId = () => {
  const NUMBER = 0x75bcd15
  const now = Date.now()
  const time = Math.floor(now / 1000).toString(16)
  const random = Math.floor(Math.random() * NUMBER)
    .toString(16)
    .padStart(5, '0')

  return time + random
}

export const getEmailDetails = async (userId: number, paidBy: number = 0) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    })

    if (!user) {
      logger.error(`No user found with the given user ID ${userId}`)
      return false
    }

    if (user.role !== Role.INTERNAL_TEAM_USER) {
      return {
        email: user.email,
        cc: [],
      }
    } else {
      const preferences = await prisma.customerNotifyPrefs.findUnique({
        where: {
          userId,
        },
      })

      if (preferences) {
        const teamMemberWhoOrdered = preferences.teamMemberWhoOrdered
        if (teamMemberWhoOrdered) {
          const orderUserDetails = await prisma.user.findUnique({
            where: {
              id: paidBy,
            },
          })
          return {
            email: orderUserDetails?.email,
            cc: [],
          }
        }
      }
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          userId,
          role: 'INTERNAL_TEAM_USER',
        },
      })

      if (!teamMember) {
        logger.info(
          `No team found with the given internal admin user ID ${userId}`
        )
        return false
      }
      const getTeamMembers = await prisma.teamMember.findMany({
        where: {
          teamId: teamMember.teamId,
          role: {
            not: 'INTERNAL_TEAM_USER',
          },
        },
        include: {
          user: true,
        },
      })

      return {
        email: getTeamMembers.filter(
          (member) => member.role === 'SUPER_ADMIN'
        )[0].user.email,
        cc: getTeamMembers
          .filter((member) => member.role !== 'SUPER_ADMIN')
          .map((member) => member.user.email),
      }
    }
  } catch (err) {
    return false
  }
}

export const getOrderStatus = async (orderId: number) => {
  const statusWeights: { [key: string]: number } = {
    PENDING: config.order_status_weights.pending,
    TRANSCRIBED: config.order_status_weights.transcribed,
    QC_ASSIGNED: config.order_status_weights.qc_assigned,
    QC_COMPLETED: config.order_status_weights.qc_completed,
    FORMATTED: config.order_status_weights.formatted,
    REVIEWER_ASSIGNED: config.order_status_weights.reviewer_assigned,
    REVIEW_COMPLETED: config.order_status_weights.reviewer_completed,
    DELIVERED: config.order_status_weights.delivered,
    CANCELLED: config.order_status_weights.cancelled,
    REFUNDED: config.order_status_weights.refunded,
    BLOCKED: config.order_status_weights.blocked,
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    })

    if (!order) {
      return false
    }

    return statusWeights[order.status]
  } catch (err) {
    return false
  }
}

export const getRefundAmount = async (fileId: string) => {
  try {
    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: {
        fileId,
      },
    })

    if (!invoiceFile) {
      return false
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceFile.invoiceId,
      },
    })

    if (!invoice) {
      return false
    }

    const chargeRate =
      invoice.discount === 0
        ? '1'
        : (invoice.discount / invoice.amount).toFixed(2)
    const refundAmount = (invoiceFile.price * parseFloat(chargeRate)).toFixed(2)

    return refundAmount
  } catch (err) {
    return false
  }
}

export const processRefund = async (
  transactionId: string,
  refundAmount: number,
  invoiceId: string,
  refundToCredits: boolean
) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceId: invoiceId },
    })

    if (!invoice) {
      logger.error(`Invoice ${invoiceId} not found`)
      return false
    }

    const {
      paymentMethod,
      creditsUsed,
      amount,
      discount,
      refundAmount: refundedAmount,
    } = invoice
    const chargedAmount = parseFloat(
      (amount - discount - creditsUsed).toFixed(2)
    )

    let creditsRefunded = invoice.creditsRefunded
    let result = null

    if (refundAmount > 0) {
      if (paymentMethod === PaymentMethod.CREDITS || refundToCredits) {
        creditsRefunded += parseFloat(refundAmount.toFixed(2))
        refundAmount = 0
      } else if (paymentMethod === PaymentMethod.CREDITCARD) {
        if (creditsUsed > 0 && refundedAmount + refundAmount > chargedAmount) {
          const creditsRefund = parseFloat(
            (refundedAmount + refundAmount - chargedAmount).toFixed(2)
          )
          refundAmount = parseFloat((refundAmount - creditsRefund).toFixed(2))
          creditsRefunded += creditsRefund
        }

        if (refundAmount > 0) {
          const transaction = await gateway.transaction.find(transactionId)

          if (
            ['submitted_for_settlement', 'authorized'].includes(
              transaction.status
            )
          ) {
            if (refundAmount == parseFloat(transaction.amount)) {
              result = await gateway.transaction.void(transactionId)
            } else {
              logger.error(
                `Cannot refund transaction ${transactionId} in ${transaction.status} state`
              )
              return false
            }
          } else if (['settled', 'settling'].includes(transaction.status)) {
            result = await gateway.transaction.refund(
              transactionId,
              refundAmount.toString()
            )
          } else if (transaction.status === 'voided') {
            logger.info(`Transaction already voided, ${invoiceId}`)
          } else {
            logger.error(`Unknown transaction status ${transaction.status}`)
            return false
          }

          if (!result?.success) {
            logger.error(
              `Braintree refund failed for ${invoiceId}, amount ${refundAmount}, error: ${JSON.stringify(
                result
              )}`
            )
            return false
          }
        }
      } else if (paymentMethod !== PaymentMethod.BILLING) {
        logger.error(`Unknown payment method ${paymentMethod} for ${invoiceId}`)
        return false
      }

      await prisma.invoice.update({
        where: { invoiceId: invoiceId },
        data: {
          refundAmount: parseFloat((refundedAmount + refundAmount).toFixed(2)),
          creditsRefunded: parseFloat(creditsRefunded.toFixed(2)),
        },
      })
    }

    logger.info(
      `Refund ${refundAmount}, credits ${creditsRefunded} successful for transaction ${transactionId}, ${invoiceId}`
    )
    return true
  } catch (error) {
    logger.error(`Error processing refund: ${error}`)
    return false
  }
}

export const getTeamSuperAdminEmailAndTeamName = async (teamId: number) => {
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    })

    if (!team) {
      logger.info(`No team found with the given team ID ${teamId}`)
      return false
    }

    const superAdmin = await prisma.user.findUnique({
      where: {
        id: team.owner,
      },
    })

    return {
      teamName: team.name,
      superAdminEmail: superAdmin?.email,
      superAdminFirstName: superAdmin?.firstname,
      superAdminFullName: `${superAdmin?.firstname} ${superAdmin?.lastname}`,
    }
  } catch (err) {
    return false
  }
}

export const isTranscriberICQC = async (transcriberId: number) => {
  try {
    const transcriberDetail = await prisma.verifier.findFirst({
      where: {
        userId: transcriberId,
        qcType: QCType.CONTRACTOR,
      },
    })

    if (!transcriberDetail) {
      return {
        isICQC: false,
        qcRate: 0,
        cfRate: 0,
        cfRRate: 0,
      }
    }

    return {
      isICQC: true,
      qcRate: transcriberDetail.qcRate,
      cfRate: transcriberDetail.cfRate,
      cfRRate: transcriberDetail.cfRRate,
    }
  } catch (error) {
    logger.error(
      `failed to check if transcriber is IC QC ${transcriberId}: ${error}`
    )
    return {
      isICQC: false,
      qcRate: 0,
      cfRate: 0,
      cfRRate: 0,
    }
  }
}

export const getCustomerRate = async (userId: number) => {
  try {
    let customerId = userId

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    })

    if (!user) {
      logger.error(`No user found for user ID ${userId}`)
      return false
    }

    if (user.role === Role.INTERNAL_TEAM_USER) {
      const teamSuperAdminDetails = await getTeamAdminUserDetails(userId)
      if (!teamSuperAdminDetails) {
        logger.error(`No team super admin found for user ID ${userId}`)
        return false
      }
      customerId = teamSuperAdminDetails.userId
    }

    const userRate = await prisma.userRate.findUnique({
      where: {
        userId: customerId,
      },
    })

    if (!userRate) {
      logger.info(`No rates found for user ID ${userId}`)
      return false
    }

    return {
      qcRate: userRate.customFormatQcRate,
      reviewerLowDifficultyRate: userRate.customFormatReviewRate,
      reviewerMediumDifficultyRate:
        userRate.customFormatMediumDifficultyReviewRate,
      reviewerHighDifficultyRate: userRate.customFormatHighDifficultyReviewRate,
      qcLowDifficultyRate: userRate.qcLowDifficultyRate,
      qcMediumDifficultyRate: userRate.qcMediumDifficultyRate,
      qcHighDifficultyRate: userRate.qcHighDifficultyRate,
      cfReviewLowDifficultyRate: userRate.cfReviewLowDifficultyRate,
      cfReviewMediumDifficultyRate: userRate.cfReviewMediumDifficultyRate,
      cfReviewHighDifficultyRate: userRate.cfReviewHighDifficultyRate,
      option: userRate.customFormatOption,
    }
  } catch (error) {
    logger.error('Failed to fetch user rates:', error)
    return false
  }
}

export const checkExistingAssignment = async (transcriberId: number) => {
  logger.info(`--> checkExistingAssignment ${transcriberId}`)

  try {
    const existingAssignment = await prisma.jobAssignment.findFirst({
      where: {
        transcriberId,
        status: JobStatus.ACCEPTED,
      },
    })

    if (existingAssignment) {
      return true
    }
    return false
  } catch (error) {
    logger.error(
      `failed to get existing assignment for ${transcriberId}: ${error}`
    )
    return false
  }
}

export const getWithdrawalsBonusesAndMiscEarnings = async (
  transcriberId: number
) => {
  logger.info(`--> getWithdrawalsBonusesAndMiscEarnings ${transcriberId}`)
  try {
    const withdrawalSum = await prisma.withdrawal.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        userId: transcriberId,
      },
    })

    const bonusSum = await prisma.bonus.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        userId: transcriberId,
      },
    })

    const miscEarningsSum = await prisma.miscEarnings.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        userId: transcriberId,
      },
    })

    return {
      withdrawals: withdrawalSum._sum.amount || 0,
      bonuses: bonusSum._sum.amount || 0,
      miscEarnings: miscEarningsSum._sum.amount || 0,
    }
  } catch (error) {
    logger.error(
      `failed to get withdrawals, bonuses and misc earnings for ${transcriberId}: ${error}`
    )
    throw new Error()
  }
}

export const getTranscriberCreditedHours = async (transcriberId: number) => {
  try {
    const assignments = await prisma.jobAssignment.findMany({
      where: {
        transcriberId: transcriberId,
        status: JobStatus.COMPLETED,
      },
      include: {
        order: {
          include: {
            File: true,
          },
        },
      },
    })

    const totalDuration = assignments.reduce(
      (total, assignment) => total + (assignment.order.File?.duration || 0),
      0
    )

    const totalWorkedHours = totalDuration / 3600

    return totalWorkedHours
  } catch (error) {
    logger.error(`failed to get credited hours for ${transcriberId}: ${error}`)
    return 0
  }
}

export const getTranscriberTodayCreditedHours = async (
  transcriberId: number
) => {
  logger.info(`--> getTranscriberTodayCreditedHours ${transcriberId}`)
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  try {
    const assignments = await prisma.jobAssignment.findMany({
      where: {
        transcriberId: transcriberId,
        status: JobStatus.COMPLETED,
        completedTs: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        order: {
          include: {
            File: true,
          },
        },
      },
    })

    const totalDuration = assignments.reduce(
      (total, assignment) => total + (assignment.order.File?.duration || 0),
      0
    )

    const totalWorkedHours = totalDuration / 3600

    return totalWorkedHours
  } catch (error) {
    logger.error(
      `failed to get today credited hours for ${transcriberId}: ${error}`
    )
    throw new Error()
  }
}

export const getAssignmentEarnings = async (transcriberId: number) => {
  logger.info(`--> getAssignmentEarnings ${transcriberId}`)
  try {
    const earningsSum = await prisma.jobAssignment.aggregate({
      _sum: {
        earnings: true,
      },
      where: {
        transcriberId: transcriberId,
        order: {
          status: 'DELIVERED',
        },
      },
    })

    const earnings = earningsSum._sum.earnings || 0
    return earnings
  } catch (error) {
    logger.error(
      `failed to get assignment earnings for ${transcriberId}: ${error}`
    )
    throw new Error()
  }
}

export const processTranscriberPayment = async (invoiceIds: string[]) => {
  try {
    let count = 0
    const items: PayoutItem[] = []
    for (const invoice of invoiceIds) {
      const withdrawal = await prisma.withdrawal.findFirst({
        where: { invoiceId: invoice },
        include: { user: true },
      })

      if (!withdrawal) {
        logger.warn(`${invoice} not found in masspay, skipping`)
        continue
      }

      const to_email = withdrawal.user.email
      const withdrawalAmount = withdrawal.amount ?? 0
      const fee = withdrawal.fee ?? 0
      const amount = parseFloat((withdrawalAmount - fee).toFixed(2))
      const to_paypal_id = withdrawal.toPaypalId ?? ''
      const status = withdrawal.status

      if (status !== WithdrawalStatus.INITIATED) {
        logger.warn(`${invoice} status is ${status} in masspay, skipping`)
        continue
      }

      items.push({
        recipient_wallet: 'PAYPAL',
        receiver: to_paypal_id,
        amount: {
          value: amount.toString(),
          currency: 'USD',
        },
        note: `Withdrawal from ${process.env.SERVER} account of ${to_email}`,
        sender_item_id: invoice,
      })

      count++
    }

    if (count > 0) {
      logger.info('Mass pay executed')

      const requestBody: CreatePayoutRequestBody = {
        sender_batch_header: {
          recipient_type: 'EMAIL' as RecipientType,
          email_message: `${process.env.SERVER} Withdrawal`,
          note: `Withdrawal from ${process.env.SERVER} account`,
          sender_batch_id: `batch_${Date.now()}`,
        },
        items,
      }
      const paypalPayout = new paypal.payouts.PayoutsPostRequest()
      paypalPayout.requestBody(requestBody)

      const response = await paypalClient.execute(paypalPayout)
      logger.info(`Mass pay executed: ${JSON.stringify(response.result)}`)
    }

    return true
  } catch (error) {
    logger.error(`mass pay failed: ${error}`)
    return false
  }
}

export const checkTranscriberPayment = async (batchId: string) => {
  try {
    const paypalPayout = new paypal.payouts.PayoutsGetRequest(batchId)

    const response = await paypalClient.execute(paypalPayout)
    logger.info(`Got status: ${JSON.stringify(response.result)}`)

    const result = response.result

    return result
  } catch (error) {
    logger.error(`failed to get status: ${error}`)
    return false
  }
}

const bucketName = process.env.AWS_S3_BUCKET_NAME ?? ''

export async function fileExistsInS3(key: string): Promise<boolean> {
  logger.info(`Checking if file exists in S3: ${key}`)
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }))
    logger.info(`File exists in S3: ${key}`)
    return true
  } catch (error) {
    logger.error(
      `Error checking if file exists in S3: ${key}, ${String(error)}`
    )
    return false
  }
}

export async function uploadToS3(
  key: string,
  body: Buffer | Readable | string,
  contentType = 'text/plain',
  customBucket: string | null = null
): Promise<{ VersionId?: string }> {
  const uploadParams = {
    Bucket: customBucket || bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  }

  logger.info(`Uploading file to S3: ${key}`)

  try {
    const command = new PutObjectCommand(uploadParams)
    const response = await s3Client.send(command)
    logger.info(`File uploaded successfully to S3: ${key}`)
    return response // This will contain the version ID
  } catch (error) {
    logger.error(`Error uploading file to S3: ${key}, ${String(error)}`)
    throw error
  }
}

export async function downloadFromS3(key: string): Promise<Buffer | string> {
  const downloadParams = {
    Bucket: bucketName,
    Key: key,
  }

  logger.info(`Downloading file from S3: ${key}`)

  try {
    const command = new GetObjectCommand(downloadParams)
    const response = await s3Client.send(command)
    const { Body } = response

    if (Body instanceof Readable) {
      const data = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        Body.on('data', (chunk) => chunks.push(chunk))
        Body.on('end', () => resolve(Buffer.concat(chunks)))
        Body.on('error', reject)
      })
      logger.info(`File downloaded successfully from S3: ${key}`)
      return data
    }
    throw new Error('Failed to download file: Invalid body stream')
  } catch (error) {
    logger.error(`Error downloading file from S3: ${key}, ${String(error)}`)
    throw error
  }
}

export async function deleteFileVersionFromS3(
  key: string,
  versionId: string
): Promise<boolean> {
  const deleteParams = {
    Bucket: bucketName,
    Key: key,
    VersionId: versionId,
  }

  logger.info(`Deleting file version from S3: ${key}, version: ${versionId}`)

  try {
    const command = new DeleteObjectCommand(deleteParams)
    await s3Client.send(command)
    logger.info(
      `File version deleted successfully from S3: ${key}, version: ${versionId}`
    )
    return true
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFound') {
      logger.warn(`File version not found in S3: ${key}, version: ${versionId}`)
      return false
    }
    logger.error(
      `Error deleting file version from S3: ${key}, version: ${versionId}, ${String(
        error
      )}`
    )
    throw error
  }
}

export async function getFileVersionFromS3(
  key: string,
  versionId: string
): Promise<Buffer> {
  const downloadParams = {
    Bucket: bucketName,
    Key: key,
    VersionId: versionId,
  }

  logger.info(`Downloading file version from S3: ${key}, version: ${versionId}`)

  try {
    const command = new GetObjectCommand(downloadParams)
    const response = await s3Client.send(command)
    const { Body } = response

    if (Body instanceof Readable) {
      const data = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        Body.on('data', (chunk) => chunks.push(chunk))
        Body.on('end', () => resolve(Buffer.concat(chunks)))
        Body.on('error', reject)
      })
      logger.info(
        `File version downloaded successfully from S3: ${key}, version: ${versionId}`
      )
      return data
    }
    throw new Error('Failed to download file version: Invalid body stream')
  } catch (error) {
    logger.error(
      `Error downloading file version from S3: ${key}, version: ${versionId}, ${String(
        error
      )}`
    )
    throw error
  }
}

export async function getSignedURLFromS3(
  key: string,
  expires: number = 900,
  filename?: string,
  customBucketName?: string
): Promise<string> {
  const encodedFilename = encodeURIComponent(filename ?? '')
  logger.info(`Generating signed URL for S3 object: ${key}`)

  const command = new GetObjectCommand({
    Bucket: customBucketName || bucketName,
    Key: key,
    ResponseContentDisposition: `attachment; filename=${encodedFilename}`,
  })

  try {
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expires,
    })
    logger.info(`Signed URL generated successfully for: ${key}`)
    return signedUrl
  } catch (error) {
    logger.error(`Error generating signed URL for ${key}: ${String(error)}`)
    throw error
  }
}

export async function getFileVersionSignedURLFromS3(
  key: string,
  versionId: string,
  expires: number = 900,
  filename?: string,
  customBucketName?: string
): Promise<string> {
  const encodedFilename = encodeURIComponent(filename ?? '')
  logger.info(
    `Generating signed URL for S3 object version: ${key}, version: ${versionId}`
  )

  const command = new GetObjectCommand({
    Bucket: customBucketName || bucketName,
    Key: key,
    VersionId: versionId || undefined,
    ResponseContentDisposition: `attachment; filename=${encodedFilename}`,
  })

  try {
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expires,
    })
    logger.info(
      `Signed URL generated successfully for: ${key}, version: ${versionId}`
    )
    return signedUrl
  } catch (error) {
    logger.error(
      `Error generating signed URL for ${key}, version: ${versionId}: ${String(
        error
      )}`
    )
    throw error
  }
}

export async function deleteFileFromS3(
  key: string,
  customBucketName?: string
): Promise<void> {
  logger.info(`Deleting S3 object: ${key}`)

  const command = new DeleteObjectCommand({
    Bucket: customBucketName || bucketName,
    Key: key,
  })

  try {
    await s3Client.send(command)
    logger.info(`Successfully deleted S3 object: ${key}`)
  } catch (error) {
    logger.error(`Error deleting S3 object ${key}: ${String(error)}`)
    throw error
  }
}

export const getTestCustomer = async (userId: number) => {
  try {
    const teamAdminDetails = await getTeamAdminUserDetails(userId)
    const customerId = teamAdminDetails ? teamAdminDetails.userId : userId

    const customer = await prisma.customer.findUnique({
      where: {
        userId: customerId,
      },
    })

    if (!customer) {
      return false
    }

    return customer.isTestCustomer
  } catch (err) {
    return false
  }
}

export const isNewCustomer = async (userId: number): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        createdAt: true,
      },
    })

    if (!user) {
      logger.error(`User not found for ID: ${userId}`)
      return false
    }

    const createdAt = new Date(user.createdAt)
    const currentDate = new Date()
    const differenceInTime = currentDate.getTime() - createdAt.getTime()

    const differenceInDays = differenceInTime / (1000 * 60 * 60 * 24)
    return differenceInDays < 30
  } catch (error) {
    logger.error(`Error checking if user ${userId} is new: ${String(error)}`)
    return false
  }
}

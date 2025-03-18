'use server'

import { InvoiceStatus, InvoiceType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import {
  generateInvoiceId,
  generateUniqueTransactionId,
} from '@/utils/backend-helper'
import isValidEmail from '@/utils/isValidEmail'

interface InviteCustomerParams {
  email: string
  addFreeCredits: boolean
}

const generateRandomString = (length: number) => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export async function inviteCustomer({
  email,
  addFreeCredits,
}: InviteCustomerParams) {
  try {
    if (!isValidEmail(email)) {
      return { success: false, message: 'Invalid email format' }
    }

    const session = await getServerSession(authOptions)
    const adminUser = session?.user

    if (!adminUser) {
      return { success: false, message: 'Unauthorized' }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return {
        success: false,
        message: 'User already exists',
      }
    }

    const inviteKey = generateRandomString(16)

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        user: email,
        status: 'CREATED',
      },
    })

    if (addFreeCredits) {
      const invoiceId = generateInvoiceId('CGFC')
      const transactionId = generateUniqueTransactionId()
      const creditAmount = 10

      await prisma.invoice.create({
        data: {
          invoiceId,
          userId: newUser.id,
          type: InvoiceType.FREE_CREDITS,
          amount: creditAmount,
          status: InvoiceStatus.PAID,
          transactionId,
          paidBy: adminUser.userId || null,
        },
      })

      logger.info(`Free credits of $10 added for new user ${email}`)
    }

    // Create or update invite
    await prisma.invite.upsert({
      where: {
        inviteKey,
      },
      update: {
        accepted: false,
      },
      create: {
        email: email.toLowerCase(),
        inviteKey,
        accepted: false,
      },
    })

    const inviteUrl = `https://${process.env.SERVER}/create/${inviteKey}`
    const adminName = `${adminUser.name || adminUser.email}`

    const emailData = {
      userEmailId: email,
    }

    const ses = getAWSSesInstance()
    await ses.sendMail('INVITE_EMAIL', emailData, {
      display_name: adminName,
      url: inviteUrl,
      free_credit: addFreeCredits
        ? 'Additionally, a free account credit of $10 has also been added to your account. You can use it to order transcripts and make other payments on Scribie. <br><br />'
        : '',
    })

    return {
      success: true,
      message: `Invitation sent to ${email}${
        addFreeCredits ? ' with $10 free credits' : ''
      }`,
      inviteUrl,
    }
  } catch (error) {
    logger.error('Error inviting customer:', error)
    return { success: false, message: 'Failed to invite customer' }
  }
}

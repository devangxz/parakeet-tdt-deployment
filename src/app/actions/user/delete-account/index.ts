'use server'

import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { deleteFile } from '@/services/file-service/delete-file'

const CUSTOMERS: Role[] = [
  Role.CUSTOMER,
  Role.ADMIN,
  Role.INTERNAL_TEAM_USER,
  Role.SUPERADMIN,
  Role.CSADMIN,
  Role.OM,
]
const TRANSCRIBERS: Role[] = [
  Role.QC,
  Role.TRANSCRIBER,
  Role.TRANSCRIBER_LEVEL_2_LEGACY,
  Role.VERIFIER_LEGACY,
  Role.REVIEWER,
  Role.PROOFREADER_LEGACY,
]

export async function deleteAccount(password: string) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    logger.info(`--> delete Account ${user?.email}`)

    if (user?.role === Role.SUPERADMIN) {
      logger.error(`Your are not allowed to Delete account. ${user?.email}`)
      return {
        success: false,
        message: 'SCB_DELETE_ACCOUNT_NO_PERM',
      }
    }

    const userDetails = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!userDetails) {
      logger.error(`user not found ${user?.email}`)
      return {
        success: false,
        message: 'User role is undefined',
      }
    }

    const comparePasswords = await bcrypt.compare(
      password,
      userDetails?.pass as string
    )

    if (!comparePasswords) {
      logger.error(`Password comparison failed ${user?.email}`)
      return {
        success: false,
        message: 'SCB_DELETE_ACCOUNT_WRONG_PASSWORD',
      }
    }

    logger.info(`Fetching orders for deletion for ${userDetails.email}`)
    const orders = await prisma.order.findMany({
      where: { userId },
      select: { id: true },
    })
    const orderIds = orders?.map((order) => order.id) ?? []

    const files = await prisma.file.findMany({
      where: { userId },
      select: { fileId: true },
    })

    const fileIds = files?.map((file) => file.fileId.toString()) ?? []

    await Promise.all(
      fileIds.map(async (fileId: string) => {
        await deleteFile({ userId, fileId })
        logger.info(`File with ID ${fileId} deleted successfully`)
        return { fileId, status: 'deleted' }
      })
    )

    logger.info(`Deleted files for ${userDetails?.email}`)

    const operations = []
    const customerRoles = Object.values(CUSTOMERS)
    const transcriberRoles = Object.values(TRANSCRIBERS)
    if (customerRoles.includes(user?.role as Role)) {
      operations.push(
        prisma.customerNotifyPrefs.deleteMany({ where: { userId } }),
        prisma.teamMember.deleteMany({ where: { userId } }),
        prisma.folder.deleteMany({ where: { userId } }),
        prisma.order.deleteMany({ where: { id: { in: orderIds } } }),
        prisma.invoice.deleteMany({ where: { userId } }),
        prisma.invoiceFile.deleteMany({ where: { fileId: { in: fileIds } } }),
        prisma.file.deleteMany({ where: { userId } }),
        prisma.defaultOption.deleteMany({ where: { userId } }),
        prisma.defaultInstruction.deleteMany({ where: { userId } }),
        prisma.userRate.deleteMany({ where: { userId } }),
        prisma.organization.deleteMany({ where: { userId } }),
        prisma.customer.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } })
      )
    } else if (transcriberRoles.includes(user?.role as Role)) {
      operations.push(
        prisma.transcriberNotifyPrefs.deleteMany({ where: { userId } }),
        prisma.jobAssignment.deleteMany({ where: { transcriberId: userId } }),
        prisma.withdrawal.deleteMany({ where: { userId } }),
        prisma.invoice.deleteMany({ where: { userId } }),
        prisma.verifier.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } })
      )
    }

    await prisma.$transaction(operations)

    logger.info(`Account deletion successful for ${user?.email}`)
    return {
      success: true,
      message: 'SCB_DELETE_ACCOUNT_SUCCESS',
    }
  } catch (error) {
    logger.error(`Error during account deletion: ${error}`)
    return {
      success: false,
      message: 'SCB_DELETE_ACCOUNT_FAILED',
    }
  }
}

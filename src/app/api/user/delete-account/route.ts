export const dynamic = 'force-dynamic'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.userId

  logger.info(`--> delete Account ${user?.user}`)

  const searchParams = req.nextUrl.searchParams
  const password = searchParams.get('password')

  try {
    if (user?.role == Role.SUPERADMIN) {
      logger.error(`Your are not allowed to Delete account. ${user?.user}`)
      const response = NextResponse.json({
        message: 'SCB_DELETE_ACCOUNT_NO_PERM',
        statusCode: 400,
      })
      return response
    }

    const userDetails = await prisma.user.findUnique({
      where: { id: user?.userId },
    })

    if (!userDetails) {
      logger.error('User or user role is undefined')
      return NextResponse.json(
        { message: 'User role is undefined' },
        { status: 400 }
      )
    }

    const comparePasswords = await bcrypt.compare(
      password as string,
      userDetails?.pass as string
    )

    if (!comparePasswords) {
      logger.error(`Password comparison failed ${user?.user}`)
      return NextResponse.json({
        message: 'SCB_DELETE_ACCOUNT_WRONG_PASSWORD',
        statusCode: 400,
      })
    }

    logger.info('Fetching orders for deletion')
    const orders = await prisma.order.findMany({
      where: { userId },
      select: { id: true },
    })
    const orderIds = orders.map((order) => order.id)

    logger.info('Fetching files for deletion')
    const files = await prisma.file.findMany({
      where: { userId },
      select: { fileId: true },
    })

    const fileIds = files.map((file) => file.fileId.toString())

    await Promise.all(
      fileIds.map(async (fileId: string) => {
        await deleteFile({ userId, fileId })
        logger.info(`File with ID ${fileId} deleted successfully`)
        return { fileId, status: 'deleted' }
      })
    )

    const operations = []
    const customerRoles = Object.values(CUSTOMERS)
    const transcriberRoles = Object.values(TRANSCRIBERS)
    if (customerRoles.includes(user?.role)) {
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
    } else if (transcriberRoles.includes(user?.role)) {
      operations.push(
        prisma.transcriberNotifyPrefs.deleteMany({ where: { userId } }),
        prisma.jobAssignment.deleteMany({ where: { transcriberId: userId } }),
        prisma.withdrawal.deleteMany({ where: { userId } }),
        prisma.invoice.deleteMany({ where: { userId } }),
        prisma.verifier.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } })
      )
    }
    ;[]

    await prisma.$transaction(operations)

    logger.info(`Account deletion successful for ${user?.user}`)
    return NextResponse.json({
      message: 'SCB_DELETE_ACCOUNT_SUCCESS',
      statusCode: 200,
    })
  } catch (error) {
    logger.error(`Error during account deletion ${user?.user} ${error}`)
    return NextResponse.json({
      message: 'SCB_DELETE_ACCOUNT_FAILED',
      statusCode: 500,
    })
  }
}

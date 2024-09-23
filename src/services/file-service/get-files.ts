import { OrderStatus } from '@prisma/client'

import prisma from '@/lib/prisma'

export async function getFilesByStatus(
  status: string,
  userId: number,
  internalTeamUserId: number | null
) {
  try {
    let files
    const commonWhereClause = {
      userId: Number(userId),
      deletedAt: null,
    }
    console.info(`--> getFiles ${userId}`)
    switch (status) {
      case 'delivered':
        files = await prisma.file.findMany({
          where: {
            archived: false,
            ...commonWhereClause,
            Orders: {
              some: {
                status: 'DELIVERED',
              },
            },
          },
          include: {
            Orders: {
              select: {
                orderType: true,
                id: true,
                deliveredTs: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
        break
      case 'in-progress':
        files = await prisma.file.findMany({
          where: {
            ...commonWhereClause,
            Orders: {
              some: {
                status: {
                  notIn: [
                    OrderStatus.DELIVERED,
                    OrderStatus.CANCELLED,
                    OrderStatus.REFUNDED,
                  ],
                },
              },
            },
          },
          include: {
            Orders: {
              select: {
                orderTs: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
        break
      case 'pending':
        files = await prisma.file.findMany({
          where: {
            ...commonWhereClause,
            OR: [
              { Orders: { none: {} } },
              {
                Orders: {
                  every: {
                    status: {
                      in: [OrderStatus.CANCELLED, OrderStatus.REFUNDED],
                    },
                  },
                },
              },
            ],
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
        break
      case 'archived':
        files = await prisma.file.findMany({
          where: {
            ...commonWhereClause,
            archived: true,
            Orders: {
              some: {
                status: OrderStatus.DELIVERED,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
        break
      default:
        console.error(
          `Invalid status type ${String(status)} for user ${String(userId)}`
        )
        return {
          success: false,
          message: 'Invalid status type',
        }
        return
    }
    console.info(
      `Files fetched successfully for user ${String(
        userId
      )} with status ${String(status)}`
    )

    const filesWithUserDetails = await Promise.all(
      files.map(async (file) => {
        let uploadedByUser

        if (internalTeamUserId) {
          const user = await prisma.user.findUnique({
            where: { id: file.uploadedBy },
            select: { firstname: true, lastname: true, email: true },
          })

          uploadedByUser = {
            firstName: user?.firstname || 'N',
            lastName: user?.lastname || 'A',
            email: user?.email || '',
          }
        } else {
          uploadedByUser = {
            firstName: '',
            lastName: '',
            email: '',
          }
        }

        return {
          ...file,
          uploadedByUser,
        }
      })
    )

    return {
      success: true,
      data: filesWithUserDetails,
    }
  } catch (error) {
    console.error(`Failed to fetch ${status} files:`, error)
    return {
      success: false,
      message: 'Failed to fetch files',
    }
  }
}

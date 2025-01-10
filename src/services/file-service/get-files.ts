import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getFilesByStatus(
  status: string,
  userId: number,
  internalTeamUserId: number | null
) {
  const teamId = internalTeamUserId ? internalTeamUserId : userId
  try {
    let files
    const commonWhereClause = {
      userId: Number(teamId),
      deletedAt: null,
    }
    logger.info(`--> getFiles ${teamId}`)
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
          include: {
            Orders: {
              select: {
                status: true,
                id: true,
              },
            },
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
      default:
        logger.error(
          `Invalid status type ${String(status)} for user ${String(userId)}`
        )
        return {
          success: false,
          message: 'Invalid status type',
        }
        return
    }
    logger.info(
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
    logger.error(`Failed to fetch ${status} files:`, error)
    return {
      success: false,
      message: 'Failed to fetch files',
    }
  }
}

export async function getAllFiles(
  parentId: number | null,
  fileIds: string,
  userId: number
) {
  try {
    const whereClause: {
      userId: number
      deletedAt: null
      parentId?: number | null | undefined
      fileId?: { in: string[] }
    } = {
      userId: Number(userId),
      deletedAt: null,
      parentId: parentId ? Number(parentId) : null,
    }

    if (fileIds !== 'null' && Array.isArray(fileIds?.toString().split(','))) {
      whereClause.fileId = {
        in: fileIds?.toString().split(','),
      }
      delete whereClause['parentId']
    }

    const files = await prisma.file.findMany({
      where: whereClause,
      include: {
        Orders: {
          select: {
            status: true,
            orderType: true,
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const filesWithStatus = files?.map((file) => ({
      ...file,
      status: file.Orders.map((order) => order.status)[0] || 'NOT_ORDERED',
      orderType: file.Orders[0]?.orderType,
      orderId: file.Orders[0]?.id,
    }))

    logger.info(`All files fetched successfully for user ${String(userId)}`)
    return {
      success: true,
      filesWithStatus,
    }
  } catch (error) {
    logger.error('Failed to fetch all files', error)
    return {
      success: false,
      message: 'Failed to fetch all files',
    }
  }
}

export async function getSharedFiles(userId: number) {
  try {
    const selectedId = userId

    const sharedFiles = await prisma.sharedFile.findMany({
      where: {
        toUserId: selectedId,
      },
      include: {
        file: {
          include: {
            Orders: true,
          },
        },
        fromUser: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    })

    const result = sharedFiles.map((sf) => ({
      id: sf.file.id,
      fileId: sf.fileId,
      permission: sf.permission,
      filename: sf.file.filename,
      duration: sf.file.duration,
      fromUserId: sf.fromUserId,
      email: sf.fromUser.email,
      fullname: `${sf.fromUser.firstname || ''} ${sf.fromUser.lastname || ''
        }`.trim(),
      status: sf.file.Orders[0]?.status ?? '',
      deliveredTs: sf.file.Orders[0]?.deliveredTs.toString() ?? '',
      rating: sf.file.Orders[0]?.rating ?? '',
      orderType: sf.file.Orders[0]?.orderType ?? '',
      orderId: sf.file.Orders[0]?.id ?? '',
    }))

    logger.info(`Sent ${result.length} shared files `)

    return { success: true, data: result }
  } catch (error) {
    logger.error(`Error sending shared files for: ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again later.',
    }
  }
}

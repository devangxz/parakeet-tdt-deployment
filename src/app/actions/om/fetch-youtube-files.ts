'use server'
import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function fetchYoutubeFilesForImport() {
  try {
    const pendingFiles = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
      },
      select: {
        fileId: true,
      },
    })
    if (pendingFiles.length === 0) {
      logger.info('No pending files found in the system')
      return {
        success: true,
        message: 'No pending files found',
        files: [],
      }
    }

    const youtubeFiles = await prisma.youTubeFile.findMany({
      where: {
        fileId: {
          in: pendingFiles.map((file) => file.fileId),
        },
        isImported: null,
      },
      select: {
        fileId: true,
        youtubeUrl: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const filesWithDetails = await Promise.all(
      youtubeFiles.map(async (youtubeFile) => {
        const fileDetails = await prisma.file.findUnique({
          where: { fileId: youtubeFile.fileId },
          select: {
            filename: true,
            userId: true,
            uploadedBy: true,
            user: {
              select: {
                email: true,
              },
            },
            Orders: {
              select: {
                id: true,
                status: true,
                orderTs: true,
                deliveryTs: true,
              },
            },
          },
        })

        return {
          fileId: youtubeFile.fileId,
          youtubeUrl: youtubeFile.youtubeUrl,
          createdAt: youtubeFile.createdAt,
          filename: fileDetails?.filename || '',
          orderStatus: fileDetails?.Orders?.[0]?.status || '',
          orderTs: fileDetails?.Orders?.[0]?.orderTs || null,
          deliveryTs: fileDetails?.Orders?.[0]?.deliveryTs || null,
          userId: fileDetails?.uploadedBy?.toString() || '',
          teamUserId: fileDetails?.userId?.toString() || '',
          userEmail: fileDetails?.user?.email || '',
        }
      })
    )

    return {
      success: true,
      message: 'Successfully fetched YouTube files',
      files: filesWithDetails,
    }
  } catch (error) {
    console.error('Error fetching YouTube files:', error)
    return {
      success: false,
      message: 'Error fetching YouTube files',
      files: [],
    }
  }
}

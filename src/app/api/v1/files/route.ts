export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getFilesByStatus } from '@/services/file-service/get-files'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const fids = searchParams.get('files')

    const user = await authenticateRequest(req as NextRequest)

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.internalTeamUserId || user.userId

    if (!status) {
      return NextResponse.json(
        { message: 'Status is required' },
        { status: 400 }
      )
    }

    if (fids) {
      try {
        const whereClause: {
          userId: number
          deletedAt: null
          fileId?: { in: string[] }
        } = {
          userId: Number(userId),
          deletedAt: null,
        }

        if (Array.isArray(fids?.toString().split(','))) {
          whereClause.fileId = {
            in: fids?.toString().split(','),
          }
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

        const filesWithUserDetails = await Promise.all(
          files.map(async (file) => {
            let uploadedByUser

            if (user.internalTeamUserId) {
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

        const filesWithStatus = filesWithUserDetails?.map((file) => {
          let status = 'pending'

          if (file.Orders && file.Orders.length > 0) {
            if (file.Orders.some((order) => order.status === 'DELIVERED')) {
              status = 'delivered'
            } else {
              status = 'inprogress'
            }
          }

          return {
            fileId: file.fileId,
            filename: file.filename,
            duration: file.duration,
            filesize: file.filesize,
            uploadedBy: {
              email: file.uploadedByUser.email,
              firstname: file.uploadedByUser.firstName,
              lastname: file.uploadedByUser.lastName,
            },
            createdAt: file.createdAt,
            customInstructions: file.customInstructions,
            downloadCount: file.downloadCount,
            status: status,
          }
        })

        logger.info(`All files fetched successfully for user ${String(userId)}`)
        return NextResponse.json({
          success: true,
          data: filesWithStatus,
        })
      } catch (error) {
        logger.error('Failed to fetch files', error)
        return NextResponse.json({
          success: false,
          message: 'Failed to fetch files',
        })
      }
    }

    const files = await getFilesByStatus(
      status,
      user.userId,
      user.internalTeamUserId
    )

    return NextResponse.json({
      success: true,
      data: files?.data?.map((file) => ({
        fileId: file.fileId,
        filename: file.filename,
        duration: file.duration,
        filesize: file.filesize,
        uploadedBy: {
          email: file.uploadedByUser.email,
          firstname: file.uploadedByUser.firstName,
          lastname: file.uploadedByUser.lastName,
        },
        createdAt: file.createdAt,
        customInstructions: file.customInstructions,
        downloadCount: file.downloadCount,
        status: status,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

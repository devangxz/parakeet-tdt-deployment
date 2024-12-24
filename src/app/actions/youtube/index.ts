'use server'

import { getServerSession } from 'next-auth'
import ytdl from 'ytdl-core'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import saveFileMetadata from '@/services/upload-service/save-file-metadata'
import { requireCustomer } from '@/utils/checkRoles'

export async function getYoutubeMetadata(url: string, fileId: string) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    if (!requireCustomer(user)) {
      return {
        success: false,
        message: 'Action is not allowed',
      }
    }

    if (!url || !fileId) {
      return {
        success: false,
        message: 'Missing required fields: url, userId, or teamUserId',
      }
    }

    if (!ytdl.validateURL(url)) {
      return {
        success: false,
        message: 'Invalid YouTube URL',
      }
    }

    const info = await ytdl.getBasicInfo(url).catch((error) => {
      if (error.message.toLowerCase().includes('private')) {
        throw new Error('This video is private')
      }
      if (error.message.toLowerCase().includes('copyright')) {
        throw new Error(
          'This video is not available due to copyright restrictions'
        )
      }
      if (error.message.toLowerCase().includes('region')) {
        throw new Error('This video is not available in your region')
      }
      throw error
    })

    if (!info?.videoDetails?.lengthSeconds) {
      throw new Error('Invalid YouTube video')
    }

    const sanitizedTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '')
    const fileKey = `${sanitizedTitle}_${fileId}.mp4`

    const metadata = {
      duration: parseFloat(info.videoDetails.lengthSeconds),
      bitRate: 0,
      sampleRate: 0,
      fileSize: 0,
      fileName: sanitizedTitle,
      fileId,
      fileKey,
      userId: user?.userId?.toString(),
      teamUserId:
        user?.internalTeamUserId?.toString() || user?.userId?.toString(),
    }

    await saveFileMetadata(metadata)

    await prisma.youTubeFile.create({
      data: {
        fileId,
        youtubeUrl: url,
        isImported: null,
      },
    })

    logger.info(
      `YouTube file metadata saved successfully for fileId: ${fileId}, userId: ${user?.userId}, url: ${url}`
    )

    return { success: true, status: 'SUCCESS' }
  } catch (error) {
    logger.error(`Failed to get YouTube Metadata: ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}

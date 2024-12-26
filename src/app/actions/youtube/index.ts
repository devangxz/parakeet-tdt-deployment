'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import saveFileMetadata from '@/services/upload-service/save-file-metadata'
import { requireCustomer } from '@/utils/checkRoles'

function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url)

    if (
      urlObj.hostname.includes('youtube.com') &&
      urlObj.pathname === '/watch'
    ) {
      const videoId = urlObj.searchParams.get('v')
      if (videoId?.length === 11) return videoId
    }

    const pathname = urlObj.pathname

    if (urlObj.hostname === 'youtu.be' && pathname.length > 1) {
      const videoId = pathname.slice(1)
      if (videoId.length === 11) return videoId
    }

    if (pathname.startsWith('/embed/')) {
      const videoId = pathname.slice(7)
      if (videoId.length === 11) return videoId
    }

    if (pathname.startsWith('/shorts/')) {
      const videoId = pathname.slice(8)
      if (videoId.length === 11) return videoId
    }

    return null
  } catch (error) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?(?:[^&]+&)*v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) return match[1]
    }

    return null
  }
}

function parseDuration(duration: string): number {
  try {
    if (!duration || typeof duration !== 'string') {
      return 0
    }

    let days = 0
    let hours = 0
    let minutes = 0
    let seconds = 0

    if (duration.includes('D')) {
      const [daysStr, timeStr] = duration.split('T')
      days = parseInt(daysStr.replace('P', '')) || 0
      duration = 'PT' + timeStr
    }

    const time = duration.replace('PT', '')

    const hoursMatch = time.match(/(\d+)H/)
    const minutesMatch = time.match(/(\d+)M/)
    const secondsMatch = time.match(/(\d+)S/)

    if (hoursMatch) hours = parseInt(hoursMatch[1])
    if (minutesMatch) minutes = parseInt(minutesMatch[1])
    if (secondsMatch) seconds = parseInt(secondsMatch[1])

    return days * 24 * 3600 + hours * 3600 + minutes * 60 + seconds
  } catch (error) {
    return 0
  }
}

export async function getYoutubeMetadata(url: string, fileId: string) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    if (!user) {
      return { success: false, message: 'User not found' }
    }

    if (!requireCustomer(user)) {
      return { success: false, message: 'Action is not allowed' }
    }

    if (!url || !fileId) {
      return {
        success: false,
        message: 'Missing required fields: url or fileId',
      }
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      return { success: false, message: 'Invalid YouTube URL' }
    }

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        url
      )}&format=json`

      const oembedResponse = await fetch(oembedUrl)
      if (!oembedResponse.ok) {
        return {
          success: false,
          message: 'This video is either private or no longer available',
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Unable to verify video availability',
      }
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
        `part=snippet,contentDetails,status&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )
    if (!response.ok) {
      const errorData = await response.json()

      if (response.status === 403) {
        return {
          success: false,
          message: 'Access to this video is restricted',
        }
      }

      throw new Error(
        `YouTube API error: ${errorData.error?.message || response.status}`
      )
    }

    const data = await response.json()

    const video = data.items?.[0]
    if (!video) {
      return { success: false, message: 'Video not found' }
    }

    if (video.status?.privacyStatus === 'private') {
      return {
        success: false,
        message: 'This video is private and cannot be accessed',
      }
    }

    const duration = parseDuration(video.contentDetails.duration)
    if (!duration) {
      return { success: false, message: 'Invalid video duration' }
    }

    const sanitizedTitle = video.snippet.title.replace(/[^\w\s]/gi, '')
    const fileKey = `${sanitizedTitle}_${fileId}.mp4`

    const metadata = {
      duration,
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
      message:
        error instanceof Error
          ? error.message
          : 'An error occurred. Please try again after some time.',
    }
  }
}

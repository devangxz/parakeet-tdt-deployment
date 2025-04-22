'use server'

import axios from 'axios'

import { fileCacheTokenAction } from '../../auth/file-cache-token'
import { Options } from '@/components/editor/VersionCompareDialog'
import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionFromS3 } from '@/utils/backend-helper'

export interface VersionComparisonResult {
  success: boolean
  fromText?: string | null
  toText?: string | null
  message?: string
}

const getTranscriptFromCommitHash = async (fileId: string, commitHash: string, token: string): Promise<string | null> => {
  try {
    const response = await axios.post(
      `${FILE_CACHE_URL}/rollback/${fileId}/${commitHash}`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    
    if (!response.data.success) {
      logger.error(`Failed to get transcript from commit hash: ${commitHash}`)
      return null
    }
    
    return response.data.transcript
  } catch (error) {
    logger.error(`Error fetching transcript from commit hash: ${commitHash}`, error)
    return null
  }
}

const getTranscriptFromS3VersionId = async (fileId: string, s3VersionId: string): Promise<string | null> => {
  try {
    const transcript = await getFileVersionFromS3(`${fileId}.txt`, s3VersionId)
    return transcript.toString()
  } catch (error) {
    logger.error(`Error fetching transcript from S3 version ID: ${s3VersionId}`, error)
    return null
  }
}

export async function getVersionComparisonAction(
  fileId: string,
  fromVersion: Options,
  toVersion: Options
): Promise<VersionComparisonResult> {
  try {
    const tokenRes = await fileCacheTokenAction()
    
    if (!tokenRes.success) {
      return {
        success: false,
        message: 'Failed to authenticate',
      }
    }

    let fromText: string | null = null
    let toText: string | null = null
    if (fromVersion.isCommitHash) {
      fromText = await getTranscriptFromCommitHash(fileId, fromVersion.versionKey, tokenRes.token as string)
    } else {
      fromText = await getTranscriptFromS3VersionId(fileId, fromVersion.versionKey)
    }

    if (toVersion.isCommitHash) {
      toText = await getTranscriptFromCommitHash(fileId, toVersion.versionKey, tokenRes.token as string)
    } else {
      toText = await getTranscriptFromS3VersionId(fileId, toVersion.versionKey)
    }

    if (!fromText || !toText) {
      return {
        success: false,
        message: 'Failed to retrieve one or both version transcripts',
      }
    }

    return {
      success: true,
      fromText,
      toText,
    }
  } catch (error) {
    logger.error('Error getting version comparison:', error)
    return {
      success: false,
      message: 'Failed to retrieve version comparison',
    }
  }
}

export interface VersionInfo {
  commitHash: string
  timestamp: string
  tag?: string
  s3VersionId?: string | null
}

export interface VersionsResult {
  success: boolean
  versions?: VersionInfo[]
  message?: string | null
}

export async function getFileVersionsAction(fileId: string): Promise<VersionsResult> {
  try {
    logger.info('--> getFileVersionsAction')
    const tokenRes = await fileCacheTokenAction()
    if (!tokenRes.success) {
      return {
        success: false,
        message: 'Failed to authenticate',
      }
    }

    // Fetch version history from file cache service
    const versionsResponse = await axios.get(
      `${FILE_CACHE_URL}/get-user-versions/${fileId}`,
      {
        headers: { Authorization: `Bearer ${tokenRes.token}` },
      }
    )

    // Get file version tags from database if available
    const fileVersions = await prisma.fileVersion.findMany({
      where: {
        fileId: fileId,
      },
    })

    const versions: VersionInfo[] = []
    
    // Handle case when versionResponse has versions
    if (versionsResponse.data?.versions?.length) {
      versionsResponse.data.versions.forEach((version: VersionInfo) => {
        versions.push({
          ...version,
          tag: version.tag,
          s3VersionId: null
        });
      });
    }

    if(fileVersions.length > 0) {
      fileVersions.forEach(version => {
        if (version.s3VersionId && version.tag) {
          versions.push({
            commitHash: version.commitHash || '',
            timestamp: version.updatedAt.toISOString(),
            tag: version.tag || '',
            s3VersionId: version.s3VersionId ?? null
          })
        }
      })
    }
    
    return {
      success: true,
      versions,
    }
  } catch (error) {
    logger.error('Error getting file versions:', error)
    return {
      success: false,
      message: 'Failed to retrieve file versions',
    }
  }
} 
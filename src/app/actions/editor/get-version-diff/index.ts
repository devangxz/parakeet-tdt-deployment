'use server'

import axios from 'axios'

import { fileCacheTokenAction } from '../../auth/file-cache-token'
import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export interface VersionComparisonResult {
  success: boolean
  fromText?: string
  toText?: string
  message?: string
}

export async function getVersionComparisonAction(
  fileId: string,
  fromVersion: string,
  toVersion: string
): Promise<VersionComparisonResult> {
  try {
    const tokenRes = await fileCacheTokenAction()
    
    if (!tokenRes.success) {
      return {
        success: false,
        message: 'Failed to authenticate',
      }
    }

    // Fetch the "from" version transcript
    const fromResponse = await axios.post(
      `${FILE_CACHE_URL}/rollback/${fileId}/${fromVersion}`,
      {},
      {
        headers: { Authorization: `Bearer ${tokenRes.token}` },
      }
    )

    // Fetch the "to" version transcript
    const toResponse = await axios.post(
      `${FILE_CACHE_URL}/rollback/${fileId}/${toVersion}`,
      {},
      {
        headers: { Authorization: `Bearer ${tokenRes.token}` },
      }
    )

    if (!fromResponse.data.success || !toResponse.data.success) {
      return {
        success: false,
        message: 'Failed to retrieve one or both version transcripts',
      }
    }

    return {
      success: true,
      fromText: fromResponse.data.transcript,
      toText: toResponse.data.transcript,
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
  s3VersionId?: string
}

export interface VersionsResult {
  success: boolean
  versions?: VersionInfo[]
  message?: string
}

export async function getFileVersionsAction(fileId: string): Promise<VersionsResult> {
  try {
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

    if (!versionsResponse.data.success) {
      return {
        success: false,
        message: 'Failed to retrieve file versions',
      }
    }

    // Get file version tags from database if available
    const fileVersions = await prisma.fileVersion.findMany({
      where: {
        fileId: fileId,
      },
    });

    // Enhance version information with tags
    const versions = versionsResponse.data.versions.map((version: VersionInfo) => {
      return {
        ...version,
        tag: version.tag,
        s3VersionId: null
      };
    });

    fileVersions.forEach(version => {
      if (version.s3VersionId && version.tag) {
        versions.push({
          commitHash: version.commitHash,
          timestamp: version.updatedAt,
          tag: version.tag,
          s3VersionId: version.s3VersionId
        })
      }
    });

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
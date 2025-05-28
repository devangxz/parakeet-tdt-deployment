'use server'

import axios from 'axios'

import { fileCacheTokenAction } from '../../auth/file-cache-token'
import { Version } from '@/components/editor/VersionCompareDialog'
import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import { getFileVersionFromS3 } from '@/utils/backend-helper'

interface VersionComparisonResult {
  success: boolean
  fromText?: string | null
  toText?: string | null
  message?: string
}

const getTranscriptFromCommitHash = async (
  fileId: string,
  commitHash: string,
  token: string,
  tag?: string
): Promise<string | null> => {
  try {
    const response = await axios.post(
      `${FILE_CACHE_URL}/rollback/${fileId}/${commitHash}/${tag}`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.data.success) {
      logger.error(
        `Failed to get transcript for file: ${fileId} from commit hash: ${commitHash}`
      )
      return null
    }

    return response.data.transcript
  } catch (error) {
    logger.error(
      `Error fetching transcript for file: ${fileId} from commit hash: ${commitHash}, error: ${error}`
    )
    return null
  }
}

const getTranscriptFromS3VersionId = async (
  fileId: string,
  s3VersionId: string
): Promise<string | null> => {
  try {
    const transcript = await getFileVersionFromS3(`${fileId}.txt`, s3VersionId)
    return transcript.toString()
  } catch (error) {
    logger.error(
      `Error fetching transcript for file: ${fileId} from S3 version ID: ${s3VersionId}, error: ${error}`
    )
    return null
  }
}

const getTranscriptForVersion = async (
  fileId: string,
  version: Version,
  token: string
): Promise<string | null> => {
  let transcript: string | null = null

  if (version.source === 'git' && version.commitHash) {
    transcript = await getTranscriptFromCommitHash(
      fileId,
      version.commitHash,
      token,
      version.tag
    )
  } else if (version.source === 'db' && version.s3VersionId) {
    transcript = await getTranscriptFromS3VersionId(fileId, version.s3VersionId)
  }

  if (!transcript?.trim()) {
    if (version.source === 'git' && version.s3VersionId) {
      transcript = await getTranscriptFromS3VersionId(
        fileId,
        version.s3VersionId
      )
    } else if (version.source === 'db' && version.commitHash) {
      transcript = await getTranscriptFromCommitHash(
        fileId,
        version.commitHash,
        token,
        version.tag
      )
    }
  }

  return transcript?.trim() ?? null
}

export async function getVersionComparisonAction(
  fileId: string,
  fromVersion: Version,
  toVersion: Version
): Promise<VersionComparisonResult> {
  try {
    const tokenRes = await fileCacheTokenAction()

    if (!tokenRes.success) {
      return {
        success: false,
        message: 'Failed to authenticate',
      }
    }

    const fromText = await getTranscriptForVersion(
      fileId,
      fromVersion,
      tokenRes.token as string
    )
    const toText = await getTranscriptForVersion(
      fileId,
      toVersion,
      tokenRes.token as string
    )

    if (!fromText || !toText) {
      logger.info(
        `Failed to retrieve one or both version transcripts for file: ${fileId}, from version: ${JSON.stringify(
          fromVersion
        )}, to version: ${JSON.stringify(toVersion)}`
      )
      return {
        success: false,
        message: 'Unable to retrieve version transcript for comparison',
      }
    }

    return {
      success: true,
      fromText,
      toText,
    }
  } catch (error) {
    logger.error(
      `Error getting version comparison for file: ${fileId}, from version: ${JSON.stringify(
        fromVersion
      )}, to version: ${JSON.stringify(toVersion)}, error: ${error}`
    )
    return {
      success: false,
      message: 'Unable to retrieve version transcript for comparison',
    }
  }
}

interface VersionsResult {
  success: boolean
  versions?: Version[]
  message?: string | null
}

export async function getFileVersionsAction(
  fileId: string
): Promise<VersionsResult> {
  try {
    logger.info('--> getFileVersionsAction')
    const tokenRes = await fileCacheTokenAction()
    if (!tokenRes.success) {
      return {
        success: false,
        message: 'Failed to authenticate',
      }
    }

    const versionsResponse = await axios.get(
      `${FILE_CACHE_URL}/get-file-versions/${fileId}`,
      {
        headers: { Authorization: `Bearer ${tokenRes.token}` },
      }
    )

    let versions: Version[] = []
    if (versionsResponse.data?.versions?.length > 0) {
      versions = versionsResponse.data.versions
    } else {
      logger.info(`No versions found for file: ${fileId}`)
      return {
        success: false,
        message: 'No versions found',
      }
    }

    return {
      success: true,
      versions,
    }
  } catch (error) {
    logger.error(
      `Error getting file versions for file: ${fileId}, error: ${error}`
    )
    return {
      success: false,
      message: 'Unable to retrieve versions',
    }
  }
}

interface VersionTranscriptResult {
  success: boolean
  text?: string | null
  message?: string
}

export async function getVersionTranscriptAction(
  fileId: string,
  version: Version
): Promise<VersionTranscriptResult> {
  try {
    const tokenRes = await fileCacheTokenAction()
    if (!tokenRes.success) {
      return {
        success: false,
        message: 'Failed to authenticate',
      }
    }

    const versionText = await getTranscriptForVersion(
      fileId,
      version,
      tokenRes.token as string
    )

    if (!versionText) {
      return {
        success: false,
        message: 'Unable to retrieve version transcript',
      }
    }

    return {
      success: true,
      text: versionText,
    }
  } catch (error) {
    logger.error(`Error retrieving version transcript for file: ${fileId}, error: ${error}`)
    return {
      success: false,
      message: 'Unable to retrieve version transcript',
    }
  }
}

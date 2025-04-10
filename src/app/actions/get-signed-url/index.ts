'use server'

import logger from '@/lib/logger'
import { getSignedURLFromS3, objectExists } from '@/utils/backend-helper'

export async function getSignedUrlAction(key: string, expires = 900, filename = '',) {
    try {
        const keyExists = await objectExists(`${key}`)
        if (!keyExists) {
          logger.error(`File does not exist in S3: ${key}`)
        }
        const signedUrl = await getSignedURLFromS3(key, expires, filename)
        logger.info(`signed URL generated successfully for file ${key}`)

        return {
            success: true,
            signedUrl,
            keyExists,
        }

    } catch (error) {
        logger.error(`Error fetching signed url from S3: ${error}`)
        const errorMessage = (error as Error).message || 'Error fetching signed url from S3'
        return {
            success: false,
            message: errorMessage
        }
    }
}
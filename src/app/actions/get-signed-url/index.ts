'use server'

import logger from '@/lib/logger'
import { getSignedURLFromS3 } from '@/utils/backend-helper'

export async function getSignedUrlAction(key: string, expires = 900, filename = '',) {
    try {
        const signedUrl = await getSignedURLFromS3(key, expires, filename)
        logger.info(`signed URL generated successfully for file ${key}`)

        return {
            success: true,
            signedUrl,
        }

    } catch (error) {
        logger.error(`Error fetching signed url from S3: ${error}`)
        return {
            success: false,
            message: 'Error fetching signed url from S3'
        }
    }
}
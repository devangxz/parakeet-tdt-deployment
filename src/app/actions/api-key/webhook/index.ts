'use server'

import axios from 'axios'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
export async function updateWebhookAction(encodedWebhook: string) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId
    const webhook = decodeURIComponent(encodedWebhook)

    if (!webhook || !webhook.startsWith('http')) {
      logger.error(`Invalid webhook URL: ${webhook}`)
      return {
        success: false,
        message: 'Invalid webhook URL',
      }
    }

    // Test webhook endpoint
    try {
      const probeResponse = await axios.post(
        webhook,
        {},
        {
          headers: {
            'User-Agent': 'Scribie API Webhook',
            'Content-Type': 'application/json',
          },
        }
      )

      if (probeResponse.status !== 200) {
        logger.error(`Webhook test failed with status ${probeResponse.status}`)
        return {
          success: false,
          message: `Webhook test failed with status ${probeResponse.status}`,
        }
      }
    } catch (error) {
      logger.error(`Failed to verify webhook URL: ${error}`)
      return {
        success: false,
        message: 'Failed to verify webhook URL',
      }
    }

    await prisma.apiKey.update({
      where: {
        userId,
      },
      data: {
        webhook,
      },
    })

    return { success: true, message: 'Webhook updated successfully' }
  } catch (error) {
    logger.error(`Webhook update error: ${error}`)
    return {
      success: false,
      message: 'Failed to update webhook',
    }
  }
}

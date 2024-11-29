import axios from 'axios'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const userToken = req.headers.get('x-user-token')
    const user = JSON.parse(userToken ?? '{}')
    const userId = user?.internalTeamUserId || user?.userId

    const { webhook: encodedWebhook } = await req.json()
    const webhook = decodeURIComponent(encodedWebhook)

    if (!webhook || !webhook.startsWith('http')) {
      logger.error(`Invalid webhook URL: ${webhook}`)
      return NextResponse.json(
        { success: false, message: 'Invalid webhook URL' },
        { status: 400 }
      )
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
        return NextResponse.json({
          success: false,
          message: `Webhook test failed with status ${probeResponse.status}`,
        })
      }
    } catch (error) {
      logger.error(`Failed to verify webhook URL: ${error}`)
      return NextResponse.json({
        success: false,
        message: 'Failed to verify webhook URL',
      })
    }
    await prisma.apiKey.update({
      where: {
        userId,
      },
      data: {
        webhook,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(`Webhook update error: ${error}`)
    return NextResponse.json({
      success: false,
      message: 'Failed to update webhook',
    })
  }
}

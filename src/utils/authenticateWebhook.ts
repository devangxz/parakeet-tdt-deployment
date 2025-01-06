import { NextRequest, NextResponse } from 'next/server'

import { verifyJwt } from '@/lib/jwt'
import { rateLimiter } from '@/lib/rateLimiter'

export type WebhookType = 'CONVERSION-WORKER' | 'LAMBDA-METADATA-EXTRACTOR' | 'YOUTUBE-WORKER' | 'ASR-WORKER' | 'LLM-WORKER'

interface RateLimitConfig {
    interval: number;
    limit: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
    interval: 60,
    limit: 500
}

async function authenticateWebhook(
    req: NextRequest,
    webhookType: WebhookType,
    customRateLimit?: RateLimitConfig
) {
    // Apply rate limiting
    const rateLimitConfig = customRateLimit || DEFAULT_RATE_LIMIT
    const rateLimitResult = await rateLimiter(req, rateLimitConfig)
    if (rateLimitResult) {
        return { error: rateLimitResult }
    }

    // Check authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            error: NextResponse.json(
                { error: 'Missing or invalid authorization header' },
                { status: 401 }
            )
        }
    }

    const token = authHeader.split(' ')[1]

    try {
        const payload = verifyJwt(token)
        if (!payload) {
            return {
                error: NextResponse.json({ error: 'Invalid token' }, { status: 401 })
            }
        }

        if (payload.type !== webhookType) {
            return {
                error: NextResponse.json({ error: 'Invalid token type' }, { status: 401 })
            }
        }

        return { payload }
    } catch (error) {
        return {
            error: NextResponse.json(
                { error: 'Unauthorized webhook request' },
                { status: 401 }
            )
        }
    }
}

export default authenticateWebhook;
import { NextRequest, NextResponse } from 'next/server';

import { verifyJwt } from '@/lib/jwt';
import logger from '@/lib/logger';
import { rateLimiter } from '@/lib/rateLimiter';

export async function POST(request: NextRequest) {
    logger.info('Received webhook POST request');

    // Apply rate limiting
    const rateLimitResult = await rateLimiter(request, { interval: 60, limit: 20 });
    if (rateLimitResult) {
        logger.warn('Rate limit exceeded for webhook request');
        return rateLimitResult;
    }

    // Check for authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.error('Unauthorized webhook attempt: No bearer token');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyJwt(token) as { status: string };
        if (typeof decoded.status !== 'string') {
            logger.error('Invalid token payload: status is not a string');
            throw new Error('Invalid token payload');
        }

        let body;
        try {
            body = await request.json();
        } catch (error) {
            logger.error('Failed to parse request body as JSON', { error });
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const { status } = body;

        // Verify that the status in the JWT match the payload
        if (decoded.status !== status) {
            logger.error('Status mismatch between JWT and payload', { jwtStatus: decoded.status, payloadStatus: status });
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        if (status === 'completed') {
            // Update your database or send a notification to the user
        } else if (status === 'failed') {
            // Handle the error, update your database, or notify the user
        } else {
            // Handle the else case
        }

        logger.info('Webhook processed successfully');
        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        logger.error('Error processing webhook', { error });
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}
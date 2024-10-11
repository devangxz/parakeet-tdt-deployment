import { NextRequest, NextResponse } from 'next/server';

import { verifyJwt } from '@/lib/jwt';
import { rateLimiter } from '@/lib/rateLimiter';
import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter(request, { interval: 60, limit: 20 });
    if (rateLimitResult) {
        return rateLimitResult;
    }

    // Check for authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Unauthorized webhook attempt: No bearer token');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyJwt(token) as { status: string };
        if (typeof decoded.status !== 'string') {
            throw new Error('Invalid token payload');
        }

        let body;
        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const { status, result } = body;

        // Verify that the status in the JWT match the payload
        if (decoded.status !== status) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        if (status === 'METADATA_EXTRACTED') {
            await redis.publish('file-events', JSON.stringify({ status, result }));
        } else if (status === 'completed') {
            // Update your database or send a notification to the user
        } else if (status === 'failed') {
            // Handle the error, update your database, or notify the user
        } else {
            // Handle the else case
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}
// TODO: Remove unnecessary logs
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimiter } from '@/lib/rateLimiter';

const JWT_SECRET = process.env.JWT_SECRET;

// if (!JWT_SECRET) {
//     throw new Error('JWT_SECRET is not set');
// }

export async function POST(request: NextRequest) {
    console.log('Webhook endpoint hit');

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
        const decoded = jwt.verify(token, JWT_SECRET as string) as jwt.JwtPayload;
        if (typeof decoded.jobId !== 'string' || typeof decoded.status !== 'string') {
            throw new Error('Invalid token payload');
        }
        console.log('Decoded JWT:', decoded);

        let body;
        try {
            body = await request.json();
            console.log('Received webhook payload:', body);
        } catch (error) {
            console.error('Error parsing webhook payload:', error);
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const { jobId, status, resultFileUrl, error } = body;

        // Verify that the jobId and status in the JWT match the payload
        if (decoded.jobId !== jobId || decoded.status !== status) {
            console.error('JWT payload does not match webhook payload');
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        console.log(`Received authenticated webhook for job ${jobId}. Status: ${status}`);

        if (status === 'completed') {
            console.log(`Job ${jobId} completed. Result: ${resultFileUrl}`);
            // Update your database or send a notification to the user
        } else if (status === 'failed') {
            console.error(`Job ${jobId} failed. Error: ${error}`);
            // Handle the error, update your database, or notify the user
        } else {
            console.warn(`Received unknown status for job ${jobId}: ${status}`);
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error('Failed to verify JWT:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}

console.log('JWT-authenticated webhook route handler loaded');
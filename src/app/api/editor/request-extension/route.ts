import { JobStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { orderId } = await req.json();
        const userToken = req.headers.get('x-user-token')
        const user = JSON.parse(userToken ?? '{}')
        const transcriberId = user?.userId

        if (!orderId) {
            return NextResponse.json(
                { success: false, message: 'Missing required parameters' },
                { status: 400 }
            );
        }
        const assignment = await prisma.jobAssignment.findFirst({
            where: {
                orderId: Number(orderId),
                transcriberId,
                status: JobStatus.ACCEPTED,
            },
        })

        if (!assignment) {
            return NextResponse.json(
                { success: false, message: 'No assignment found' },
                { status: 404 }
            );
        }

        await prisma.jobAssignment.update({
            where: {
                id: assignment.id,
            },
            data: {
                extensionRequested: true,
            },
        })

        return NextResponse.json(
            { success: true, message: 'Extension requested successfully' },
            { status: 200 }
        );
    } catch (err) {
        logger.error(
            `An error occurred while requesting extension for the order: ${(err as Error).message}`
        );
        return NextResponse.json(
            { success: false, message: 'Failed to request extension.' },
            { status: 500 }
        );
    }
}

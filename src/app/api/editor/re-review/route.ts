import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
    const { fileId, comment } = await req.json();

    try {

        if (!fileId) {
            return NextResponse.json({ success: false, message: 'File ID is required' }, { status: 400 });
        }

        await prisma.order.update({
            where: { fileId },
            data: {
                reReview: true,
                reReviewComment: comment,
            },
        });

        return NextResponse.json(
            { success: true, message: 'Re-Review requested successfully' },
            { status: 200 }
        );
    } catch (err) {
        logger.error(
            `An error occurred while processing re-review request for file ${fileId}: ${(err as Error).message}`
        );
        return NextResponse.json(
            { success: false, message: `An error occurred while processing re-review request for file ${fileId}: ${(err as Error).message}` },
            { status: 500 }
        );
    }
}

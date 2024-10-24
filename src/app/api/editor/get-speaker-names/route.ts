export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import getSpeakerNames from '@/services/editor-service/getSpeakerNames';

export async function GET(request: Request) {
    let fileId: null | string = ''
    try {
        const { searchParams } = new URL(request.url);
        fileId = searchParams.get('fileId');

        if (!fileId) {
            return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
        }

        const { success, data, message } = await getSpeakerNames(fileId);

        if (success === false) {
            return NextResponse.json({ error: message }, { status: 404 });
        }

        const speakerNames = data;

        if (!speakerNames) {
            return NextResponse.json([]);
        }

        if (!speakerNames[fileId] || !speakerNames[fileId].length) {
            return NextResponse.json([]);
        }

        const speakerNamesList = speakerNames[fileId];

        return NextResponse.json(speakerNamesList);

    } catch (error) {
        logger.error(`error getting speaker name for file ${fileId}: ${error}`);
        return NextResponse.json({ error: 'Failed to fetch speaker names' }, { status: 500 });
    }
}

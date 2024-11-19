import axios from 'axios';
import { JwtPayload } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { verifyJwt } from '@/lib/jwt';

interface OneDriveTokenPayload extends JwtPayload {
    oneDriveAccessToken: string;
}

export async function GET() {
    try {
        const cookieStore = cookies();
        const encryptedToken = cookieStore.get('oneDriveAccessToken')?.value;

        if (!encryptedToken) {
            return NextResponse.json({ isValid: false, needsRefresh: true });
        }

        const decodedToken = verifyJwt(encryptedToken) as OneDriveTokenPayload;

        if (!decodedToken) {
            return NextResponse.json({ isValid: false, needsRefresh: true });
        }

        try {
            await axios.get('https://graph.microsoft.com/v1.0/me', {
                headers: {
                    'Authorization': `Bearer ${decodedToken.oneDriveAccessToken}`
                }
            });
            return NextResponse.json({ isValid: true, needsRefresh: false });
        } catch (error) {
            return NextResponse.json({ isValid: false, needsRefresh: true });
        }
    } catch (error) {
        return NextResponse.json({ isValid: false, needsRefresh: true });
    }
}
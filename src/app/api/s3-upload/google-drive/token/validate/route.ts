import axios from 'axios';
import { JwtPayload } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { verifyJwt } from '@/lib/jwt';

interface GoogleTokenPayload extends JwtPayload {
    googleAccessToken: string;
}

export async function GET() {
    try {
        const cookieStore = cookies();
        const encryptedToken = cookieStore.get('googleAccessToken')?.value;

        if (!encryptedToken) {
            return NextResponse.json({ isValid: false, needsRefresh: true });
        }

        const decodedToken = verifyJwt(encryptedToken) as GoogleTokenPayload;

        if (!decodedToken) {
            return NextResponse.json({ isValid: false, needsRefresh: true });
        }

        try {
            const { status } = await axios.get(
                `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${decodedToken.googleAccessToken}`
            );
            return NextResponse.json({ isValid: status === 200, needsRefresh: status !== 200 });
        } catch (error) {
            return NextResponse.json({ isValid: false, needsRefresh: true });
        }
    } catch (error) {
        return NextResponse.json({ isValid: false, needsRefresh: true });
    }
}
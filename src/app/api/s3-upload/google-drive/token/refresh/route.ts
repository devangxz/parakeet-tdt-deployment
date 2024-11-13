import axios from 'axios';
import { JwtPayload } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { signJwtAccessToken, verifyJwt } from '@/lib/jwt';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

const isProduction = SITE_URL?.startsWith('https://') ?? true;

interface GoogleTokenPayload extends JwtPayload {
    googleAccessToken: string;
}

interface GoogleRefreshTokenPayload extends JwtPayload {
    googleRefreshToken: string;
}

export async function GET() {
    try {
        const cookieStore = cookies();
        const encryptedRefreshToken = cookieStore.get('googleRefreshToken')?.value;
        
        if (!encryptedRefreshToken) {
            throw new Error('No refresh token found');
        }

        const decodedRefreshToken = verifyJwt(encryptedRefreshToken) as GoogleRefreshTokenPayload;
        
        if (!decodedRefreshToken) {
            throw new Error('Invalid refresh token');
        }

        const { data } = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: decodedRefreshToken.googleRefreshToken,
            grant_type: 'refresh_token'
        });

        if (!data.access_token) {
            throw new Error('Token refresh failed');
        }

        const accessTokenPayload: GoogleTokenPayload = {
            googleAccessToken: data.access_token
        };
        const newEncryptedAccessToken = signJwtAccessToken(accessTokenPayload, { expiresIn: '24h' });

        cookieStore.set('googleAccessToken', newEncryptedAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
    }
}
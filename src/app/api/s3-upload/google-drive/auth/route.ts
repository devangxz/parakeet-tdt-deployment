import axios from 'axios';
import { JwtPayload } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { signJwtAccessToken } from '@/lib/jwt';

interface GoogleTokenPayload extends JwtPayload {
    googleAccessToken: string;
}

interface GoogleRefreshTokenPayload extends JwtPayload {
    googleRefreshToken: string;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

const isProduction = SITE_URL?.startsWith('https://') ?? true;

export async function POST(req: Request) {
    try {
        const { code } = await req.json();

        const { data } = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: SITE_URL
        });

        if (!data.access_token) {
            throw new Error('Authentication failed');
        }

        const accessTokenPayload: GoogleTokenPayload = {
            googleAccessToken: data.access_token
        };
        const encryptedAccessToken = signJwtAccessToken(accessTokenPayload, { expiresIn: '24h' });

        let encryptedRefreshToken = null;
        if (data.refresh_token) {
            const refreshTokenPayload: GoogleRefreshTokenPayload = {
                googleRefreshToken: data.refresh_token
            };
            encryptedRefreshToken = signJwtAccessToken(refreshTokenPayload, { expiresIn: '30d' });
        }

        const cookieStore = cookies();

        cookieStore.set('googleAccessToken', encryptedAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60
        });

        if (encryptedRefreshToken) {
            cookieStore.set('googleRefreshToken', encryptedRefreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
}
import axios from 'axios';
import { JwtPayload } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { signJwtAccessToken, verifyJwt } from '@/lib/jwt';

const BOX_CLIENT_ID = process.env.NEXT_PUBLIC_BOX_CLIENT_ID!;
const BOX_CLIENT_SECRET = process.env.BOX_CLIENT_SECRET!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

const isProduction = SITE_URL?.startsWith('https://') ?? true;

interface BoxRefreshTokenPayload extends JwtPayload {
    boxRefreshToken: string;
}

export async function GET() {
    try {
        const cookieStore = cookies();
        const encryptedRefreshToken = cookieStore.get('boxRefreshToken')?.value;

        if (!encryptedRefreshToken) {
            throw new Error('No refresh token found');
        }

        const decodedRefreshToken = verifyJwt(encryptedRefreshToken) as BoxRefreshTokenPayload;

        if (!decodedRefreshToken) {
            throw new Error('Invalid refresh token');
        }

        const { data } = await axios.post('https://api.box.com/oauth2/token', {
            grant_type: 'refresh_token',
            refresh_token: decodedRefreshToken.boxRefreshToken,
            client_id: BOX_CLIENT_ID,
            client_secret: BOX_CLIENT_SECRET
        });

        if (!data.access_token) {
            throw new Error('Token refresh failed');
        }

        const accessTokenPayload = {
            boxAccessToken: data.access_token
        };
        const newEncryptedAccessToken = signJwtAccessToken(accessTokenPayload, { expiresIn: '1h' });

        cookieStore.set('boxAccessToken', newEncryptedAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 60 * 60
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
    }
}
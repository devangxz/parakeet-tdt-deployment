import axios from 'axios';
import { JwtPayload } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { signJwtAccessToken, verifyJwt } from '@/lib/jwt';

const ONEDRIVE_CLIENT_ID = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID!;
const ONEDRIVE_CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

const isProduction = SITE_URL?.startsWith('https://') ?? true;

interface OneDriveTokenPayload extends JwtPayload {
    oneDriveAccessToken: string;
}

interface OneDriveRefreshTokenPayload extends JwtPayload {
    oneDriveRefreshToken: string;
}

export async function GET() {
    try {
        const cookieStore = cookies();
        const encryptedRefreshToken = cookieStore.get('oneDriveRefreshToken')?.value;
        
        if (!encryptedRefreshToken) {
            throw new Error('No refresh token found');
        }

        const decodedRefreshToken = verifyJwt(encryptedRefreshToken) as OneDriveRefreshTokenPayload;
        
        if (!decodedRefreshToken) {
            throw new Error('Invalid refresh token');
        }

        const tokenResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token',
            new URLSearchParams({
                client_id: ONEDRIVE_CLIENT_ID,
                client_secret: ONEDRIVE_CLIENT_SECRET,
                refresh_token: decodedRefreshToken.oneDriveRefreshToken,
                grant_type: 'refresh_token'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token } = tokenResponse.data;

        if (!access_token) {
            throw new Error('Token refresh failed');
        }

        const accessTokenPayload: OneDriveTokenPayload = {
            oneDriveAccessToken: access_token
        };
        const newEncryptedAccessToken = signJwtAccessToken(accessTokenPayload, { expiresIn: '1h' });

        cookieStore.set('oneDriveAccessToken', newEncryptedAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 60 * 60
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
    }
}
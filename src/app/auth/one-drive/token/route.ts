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
            return NextResponse.json({ error: 'No token found' }, { status: 401 });
        }

        const decodedToken = verifyJwt(encryptedToken) as OneDriveTokenPayload;
        
        if (!decodedToken) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        return NextResponse.json({ token: decodedToken.oneDriveAccessToken });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to get token' }, { status: 401 });
    }
}
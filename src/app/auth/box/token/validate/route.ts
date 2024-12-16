import axios from 'axios';
import { JwtPayload } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { verifyJwt } from '@/lib/jwt';

interface BoxTokenPayload extends JwtPayload {
    boxAccessToken: string;
}

export async function GET() {
    try {
        const cookieStore = cookies();
        const encryptedToken = cookieStore.get('boxAccessToken')?.value;

        if (!encryptedToken) {
            return NextResponse.json({ isValid: false, needsRefresh: true });
        }

        const decodedToken = verifyJwt(encryptedToken) as BoxTokenPayload;

        if (!decodedToken) {
            return NextResponse.json({ isValid: false, needsRefresh: true });
        }

        try {
            const { status } = await axios.get(
                'https://api.box.com/2.0/users/me',
                {
                    headers: { 'Authorization': `Bearer ${decodedToken.boxAccessToken}` }
                }
            );
            return NextResponse.json({ isValid: status === 200, needsRefresh: status !== 200 });
        } catch (error) {
            return NextResponse.json({ isValid: false, needsRefresh: true });
        }
    } catch (error) {
        return NextResponse.json({ isValid: false, needsRefresh: true });
    }
}
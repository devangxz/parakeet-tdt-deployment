import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const BOX_CLIENT_ID = process.env.NEXT_PUBLIC_BOX_CLIENT_ID!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

export async function GET() {
    const state = Math.random().toString(36).substring(7);
    const cookieStore = cookies();

    cookieStore.set('boxAuthState', state, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 5
    });

    const authUrl = new URL('https://account.box.com/api/oauth2/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', BOX_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', `${SITE_URL}/auth/box/callback`);
    authUrl.searchParams.append('state', state);

    return NextResponse.redirect(authUrl.toString());
}
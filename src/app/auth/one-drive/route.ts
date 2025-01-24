import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ONEDRIVE_CLIENT_ID = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

export async function GET() {
    const state = Math.random().toString(36).substring(7);
    const cookieStore = cookies();

    cookieStore.set('oneDriveAuthState', state, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 5
    });

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', ONEDRIVE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', `${SITE_URL}/auth/one-drive/callback`);
    authUrl.searchParams.append('scope', 'files.read, Files.ReadWrite.All, Files.ReadWrite, offline_access');
    authUrl.searchParams.append('state', state);

    return NextResponse.redirect(authUrl.toString());
}
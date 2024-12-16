import axios from 'axios';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { signJwtAccessToken } from '@/lib/jwt';

const ONEDRIVE_CLIENT_ID = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID!;
const ONEDRIVE_CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

const isProduction = SITE_URL?.startsWith('https://') ?? true;

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const cookieStore = cookies();
        const savedState = cookieStore.get('oneDriveAuthState')?.value;

        if (!code || !state || state !== savedState) {
            return createHtmlResponse('Authentication Failed', 'Invalid state parameter', false);
        }

        const tokenResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token',
            new URLSearchParams({
                client_id: ONEDRIVE_CLIENT_ID,
                client_secret: ONEDRIVE_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: `${SITE_URL}/auth/one-drive/callback`
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token, refresh_token } = tokenResponse.data;

        if (!access_token) {
            return createHtmlResponse('Authentication Failed', 'Failed to get access token', false);
        }

        const accessTokenPayload = {
            oneDriveAccessToken: access_token
        };
        const encryptedAccessToken = signJwtAccessToken(accessTokenPayload, { expiresIn: '1h' });

        let encryptedRefreshToken = null;
        if (refresh_token) {
            const refreshTokenPayload = {
                oneDriveRefreshToken: refresh_token
            };
            encryptedRefreshToken = signJwtAccessToken(refreshTokenPayload, { expiresIn: '90d' });
        }

        const response = createHtmlResponse('Authentication Successful', 'You can close this window.', true);

        response.cookies.set('oneDriveAccessToken', encryptedAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 60 * 60
        });

        if (encryptedRefreshToken) {
            response.cookies.set('oneDriveRefreshToken', encryptedRefreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'lax',
                maxAge: 90 * 24 * 60 * 60
            });
        }

        return response;
    } catch (error) {
        return createHtmlResponse('Authentication Failed', 'An error occurred during authentication.', false);
    }
}

function createHtmlResponse(title: string, message: string, success: boolean) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background-color: #f5f5f5;
                }
                .container {
                    text-align: center;
                    padding: 2rem;
                    background-color: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                h1 {
                    color: ${success ? '#0061d5' : '#dc2626'};
                    margin-bottom: 1rem;
                }
                p {
                    color: #4b5563;
                    margin-bottom: 2rem;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>${title}</h1>
                <p>${message}</p>
            </div>
            <script>
                if (window.opener) {
                    window.opener.postMessage({ 
                        type: '${success ? 'ONEDRIVE_AUTH_SUCCESS' : 'ONEDRIVE_AUTH_ERROR'}' 
                    }, '*');
                    setTimeout(() => window.close(), 1500);
                }
            </script>
        </body>
        </html>
    `;

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
        },
    });
}
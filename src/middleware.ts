import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode('your-secret-key-change-it-in-prod');

export async function middleware(request: NextRequest) {
    // Only protect /reports route
    if (request.nextUrl.pathname.startsWith('/reports')) {
        const token = request.cookies.get('admin_token');

        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        try {
            await jwtVerify(token.value, JWT_SECRET);
            return NextResponse.next();
        } catch (err) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/reports/:path*',
};

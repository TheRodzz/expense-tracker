import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_TOKEN_LENGTH = 32;

export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

export function setCsrfCookie(res: NextResponse, token: string) {
  res.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // frontend must read it
    sameSite: 'none',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });
}

export function getCsrfTokenFromRequest(req: NextRequest): string | undefined {
  return req.cookies.get(CSRF_COOKIE_NAME)?.value;
}

export function getCsrfTokenFromHeader(req: NextRequest): string | undefined {
  return req.headers.get(CSRF_HEADER_NAME) || undefined;
}

export function validateCsrf(req: NextRequest): boolean {
  const cookieToken = getCsrfTokenFromRequest(req);
  const headerToken = getCsrfTokenFromHeader(req);
  return !!cookieToken && !!headerToken && cookieToken === headerToken;
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };

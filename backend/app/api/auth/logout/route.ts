import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
  // Clear the auth and CSRF cookies by setting them to expire in the past
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Set-Cookie': [
        `auth_token=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`,
        `csrf_token=; Path=/; HttpOnly=false; Secure; SameSite=None; Max-Age=0`
      ].join(', ')
    }
  });
}

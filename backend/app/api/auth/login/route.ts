import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateCsrfToken, setCsrfCookie } from '@/lib/csrf';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      console.error('Login failed:', error?.message || 'No session returned');
      return NextResponse.json({ error: error?.message || 'Login failed' }, { status: 401 });
    }

    const accessToken = data.session.access_token;

    // Set the JWT as an HTTP-only, Secure cookie
    const csrfToken = generateCsrfToken();
    const response = NextResponse.json({ success: true, csrfToken }, { status: 200 });
    response.cookies.set('auth_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    setCsrfCookie(response, csrfToken);
    return response;

  } catch (err: unknown) {
    console.error('Unexpected error during login:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}



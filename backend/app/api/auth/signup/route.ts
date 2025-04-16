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

    // Attempt signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) {
      console.error('Signup failed:', error?.message || 'No user returned');
      return NextResponse.json({ error: error?.message || 'Signup failed' }, { status: 400 });
    }

    // If session is returned (signup does not require email confirmation), set cookie
    if (data.session && data.session.access_token) {
      const accessToken = data.session.access_token;
      const csrfToken = generateCsrfToken();
      const response = NextResponse.json({
        message: 'Signup successful.',
        user: data.user,
        csrfToken,
      }, { status: 201 });
      response.headers.set(
        'Set-Cookie',
        `auth_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800`
      );
      setCsrfCookie(response, csrfToken);
      return response;
    }
    // Otherwise, just return user info and prompt for email confirmation
    return NextResponse.json(
      {
        message: 'Signup successful. Check your email for confirmation (if enabled).',
        user: data.user,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Unexpected error during signup:', err);
    // Check if err is an instance of Error before accessing message
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// lib/supabase/utils.ts
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { PostgrestError } from '@supabase/supabase-js';

// Consistent error response format
interface ErrorResponse {
    error: string;
    details?: unknown;
}

export function handleError(error: unknown): NextResponse<ErrorResponse> {
    console.error("API Error:", error); // Log the actual error

    if (error instanceof ZodError) {
        return NextResponse.json(
            { error: "Validation failed", details: error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    if (error instanceof SyntaxError && error.message.includes('JSON')) {
         return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (isPostgrestError(error)) {
        // Handle common Postgrest errors
        switch (error.code) {
            case '23505': // unique_violation
                return NextResponse.json({ error: 'Conflict: Resource already exists (e.g., duplicate name).', details: error.details }, { status: 409 });
            case '23503': // foreign_key_violation
                // Could be 404 (if referencing non-existent ID) or 409 (if trying to delete something in use)
                 if (error.details?.includes('is still referenced')) {
                     return NextResponse.json({ error: 'Conflict: Resource is still in use and cannot be deleted.', details: error.details }, { status: 409 });
                 }
                 return NextResponse.json({ error: 'Bad Request: Related resource not found or constraint violation.', details: error.details }, { status: 400 }); // Or 404 depending on context
            case 'PGRST116': // PGRST116: Row not found
                 // This often happens on update/delete if RLS filters it out or ID is wrong
                 return NextResponse.json({ error: 'Not Found' }, { status: 404 });
            // Add more specific codes as needed
            default:
                return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
        }
    }

     if (error instanceof Error && error.message.includes('Authorization')) {
         return NextResponse.json({ error: "Unauthorized: " + error.message }, { status: 401 });
     }
    if (error instanceof Error && error.message === "Not Implemented") {
        return NextResponse.json({ error: "Not Implemented" }, { status: 501 });
    }


    // Generic fallback
    return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
    );
}

// Type guard for PostgrestError
function isPostgrestError(error: unknown): error is PostgrestError {
    return typeof error === 'object' && error !== null && 'code' in error && 'message' in error && 'details' in error;
}

export function handleSuccess<T>(data: T | null, status: number = 200): NextResponse<T> | NextResponse<null> {
    if (status === 204) {
        return new NextResponse<null>(null, { status: 204 });    }
    return NextResponse.json(data as T, { status });
}

export function handleAuthError(): NextResponse<ErrorResponse> {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
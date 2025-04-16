// app/api/categories/route.ts
import { NextRequest } from 'next/server';
import { createSupabaseServerClientWithAuthHeader } from '@/lib/supabase/server'; // Adjust path
import { CategoryCreateSchema, GetCategoriesQuerySchema } from '@/lib/zod/schemas'; // Adjust path
import { handleError, handleSuccess, handleAuthError } from '@/lib/supabase/utils'; // Adjust path

export async function GET(request: NextRequest) {
    try {
        const { supabase, user } = await createSupabaseServerClientWithAuthHeader(request);
        if (!supabase || !user) return handleAuthError();

        // Validate query parameters for pagination
        const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
        const validationResult = GetCategoriesQuerySchema.safeParse(queryParams);

        if (!validationResult.success) {
            throw validationResult.error; // Let handleError handle the 400 response
        }
        const { skip, limit } = validationResult.data;
        // RLS ensures we only get categories for the authenticated user
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('created_at', { ascending: true })
            .range(skip!, limit! - 1); // Apply pagination

        if (error) throw error;

        return handleSuccess(data);

    } catch (error) {
        return handleError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { supabase, user } = await createSupabaseServerClientWithAuthHeader(request);
        if (!supabase || !user) return handleAuthError();

        const json = await request.json();
        const payload = CategoryCreateSchema.parse(json);
        // RLS implicitly sets user_id based on the authenticated user
        const { data, error } = await supabase
            .from('categories')
            .insert({ name: payload.name, is_expense: payload.is_expense, user_id: user.id })
            .select() // Return the created object
            .single(); // Expecting a single row back

        if (error) throw error;

        return handleSuccess(data, 201); // 201 Created

    } catch (error) {
        // HandleError will catch ZodErrors (400) and PostgrestErrors (e.g., 409 for unique name violation)
        return handleError(error);
    }
}
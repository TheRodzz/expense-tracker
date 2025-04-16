// app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuthHeader } from '@/lib/supabase/server';
import { ExpenseCreateSchema, GetExpensesQuerySchema } from '@/lib/zod/schemas';
import { handleError, handleSuccess, handleAuthError } from '@/lib/supabase/utils';

export async function GET(request: NextRequest) {
    try {
        const { supabase, user } = await createSupabaseServerClientWithAuthHeader(request);
        if (!supabase || !user) return handleAuthError();

        // Validate query parameters
        const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
        const validationResult = GetExpensesQuerySchema.safeParse(queryParams);

        if (!validationResult.success) {
             // Use ZodError instance for detailed error reporting
             throw validationResult.error;
        }
        const { startDate, endDate, categoryId, paymentMethodId, type, skip, limit } = validationResult.data;


        let query = supabase
            .from('expenses')
            .select('*');
            // RLS automatically filters by user_id

        // Apply filters
        if (startDate) query = query.gte('timestamp', startDate);
        if (endDate) query = query.lte('timestamp', endDate);
        if (categoryId) query = query.eq('category_id', categoryId);
        if (paymentMethodId) query = query.eq('payment_method_id', paymentMethodId);
        if (type) query = query.eq('type', type);

        // Apply sorting and pagination
        query = query
            .order('timestamp', { ascending: false }) // Default sort: newest first
            .range(skip!, skip! + limit! - 1); // Add null assertion as defaults are set

        const { data, error } = await query;

        if (error) throw error;

        return handleSuccess(data);

    } catch (error) {
        return handleError(error); // Handles validation errors too
    }
}

export async function POST(request: NextRequest) {
    try {
        const { supabase, user } = await createSupabaseServerClientWithAuthHeader(request);
        if (!supabase || !user) return handleAuthError();

        const json = await request.json();
        const payload = ExpenseCreateSchema.parse(json);

        // Optional: Verify category_id and payment_method_id belong to the user *before* insert
        // This adds extra checks but prevents confusing FK errors if RLS isn't perfect on related tables.
        const { count: catCount, error: catErr } = await supabase.from('categories').select('id', { count: 'exact'}).eq('id', payload.category_id).eq('user_id', user.id) // RLS should handle user check
        if (catErr || catCount === 0) return NextResponse.json({ error: "Category not found for this user" }, { status: 404 });
        const { count: pmCount, error: pmErr } = await supabase.from('payment_methods').select('id', { count: 'exact'}).eq('id', payload.payment_method_id);
        if (pmErr || pmCount === 0) return NextResponse.json({ error: "Payment method not found for this user" }, { status: 404 });

        // RLS implicitly sets user_id
        const { data, error } = await supabase
            .from('expenses')
            .insert({
                ...payload,
                user_id: user.id
            })
            .select()
            .single();

        if (error) {
             // Let handleError handle potential FK violations (e.g., category_id doesn't exist) -> 400/404
             throw error;
         }


        return handleSuccess(data, 201);

    } catch (error) {
        return handleError(error);
    }
}
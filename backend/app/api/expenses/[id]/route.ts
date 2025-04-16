// app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuthHeader } from '@/lib/supabase/server';
import { ExpenseUpdateSchema } from '@/lib/zod/schemas';
import { handleError, handleSuccess, handleAuthError } from '@/lib/supabase/utils';
import { z } from 'zod';

const IdParamSchema = z.object({ id: z.string().uuid() });

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { params } = context;
        const { id } = await params; // Await the params promise

        const { supabase, user } = await createSupabaseServerClientWithAuthHeader(request);
        if (!supabase || !user) return handleAuthError();

        const paramsValidation = IdParamSchema.safeParse({ id });
        if (!paramsValidation.success) throw paramsValidation.error;

        // RLS restricts selection
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id) // RLS handles this
            .maybeSingle(); // Use maybeSingle to handle null case gracefully

        if (error) throw error;

        if (!data) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        }

        return handleSuccess(data);

    } catch (error) {
        return handleError(error);
    }
}


export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
     try {
        const { params } = context;
        const { id } = await params; // Await the params promise
        const { supabase, user } = await createSupabaseServerClientWithAuthHeader(request);
        if (!supabase || !user) return handleAuthError();

        const paramsValidation = IdParamSchema.safeParse({ id });
        if (!paramsValidation.success) throw paramsValidation.error;

        const json = await request.json();
        const payload = ExpenseUpdateSchema.parse(json); // Validates partial update

        // Optional: Pre-verify category_id/payment_method_id if they are included in the payload
        // ... (similar checks as in POST /expenses if desired) ...

        // RLS restricts update
        const { data, error } = await supabase
            .from('expenses')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id) // RLS handles this
            .select()
            .single(); // Expect one row updated

        if (error) {
            handleError(error);
            // // Handle specific case where RLS prevents update or ID doesn't exist
            // if (error.code === 'PGRST116' || !data) {
            //      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
            // }
            // // Handle FK violation if payload contains invalid category/payment method IDs
            // if (error.code === '23503') {
            //      return NextResponse.json({ error: 'Bad Request: Invalid category_id or payment_method_id provided.' }, { status: 400 });
            // }
            //  throw error;
         }
        if (!data) { // Double check
             return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        }

        return handleSuccess(data);

    } catch (error) {
        return handleError(error);
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
     try {
        const { params } = context;
        const { id } = await params; // Await the params promise
        const { supabase, user } = await createSupabaseServerClientWithAuthHeader(request);
        if (!supabase || !user) return handleAuthError();

        const paramsValidation = IdParamSchema.safeParse({ id });
        if (!paramsValidation.success) throw paramsValidation.error;
        // const { id } = paramsValidation.data;

        // RLS restricts deletion
        const { error, count } = await supabase
            .from('expenses')
            .delete({ count: 'exact' }) // Request count
            .eq('id', id)
            .eq('user_id', user.id); // RLS handles this

        if (error) throw error; // Let handleError handle db errors

        // Check if exactly one row was deleted
        if (count === 0) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        }

        return handleSuccess(null, 204); // 204 No Content

    } catch (error) {
        return handleError(error);
    }
}

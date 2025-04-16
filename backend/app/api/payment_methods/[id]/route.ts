// app/api/payment_methods/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientWithAuthHeader } from '@/lib/supabase/server';
import { PaymentMethodCreateSchema } from '@/lib/zod/schemas';
import { handleError, handleSuccess, handleAuthError } from '@/lib/supabase/utils';
import { z } from 'zod';

const PartialCategorySchema = PaymentMethodCreateSchema.partial(); // Allow partial updates for PATCH
const IdParamSchema = z.object({ id: z.string().uuid() });

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { params } = context;
        const { id } = await params;
        const { supabase, user } = await createSupabaseServerClientWithAuthHeader(request);
        if (!supabase || !user) return handleAuthError();

        const paramsValidation = IdParamSchema.safeParse({ id });
        if (!paramsValidation.success) throw paramsValidation.error;

        const json = await request.json();
        // Validate only the 'name' field if provided
        const payload = PartialCategorySchema.parse(json);

        if (!payload.name) {
            return NextResponse.json({ error: "Only the 'name' field can be updated." }, { status: 400 });
        }

        // RLS restricts update to the user's own payment_methods
        const { data, error } = await supabase
            .from('payment_methods')
            .update({ name: payload.name, is_expense: payload.is_expense, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id) // RLS makes this redundant but explicit check is fine too
            .select()
            .single();

        if (error) {
            // Handle specific case where RLS prevents update or ID doesn't exist
            if (error.code === 'PGRST116' || !data) {
                return NextResponse.json({ error: 'Not Found' }, { status: 404 });
            }
            throw error; // Handle other errors (like unique constraint violation - 409)
        }
        if (!data) { // Double check if update returned null data despite no error
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
        const { id } = await params;
        const { supabase, user } = await createSupabaseServerClientWithAuthHeader(request);
        if (!supabase || !user) return handleAuthError();

        const paramsValidation = IdParamSchema.safeParse({ id });
        if (!paramsValidation.success) throw paramsValidation.error;

        // RLS restricts deletion to the user's own category
        const { error, count } = await supabase
            .from('payment_methods')
            .delete({ count: 'exact' }) // Request count of deleted rows
            .eq('id', id)
        .eq('user_id', user.id); // RLS makes this redundant

        if (error) {
            // Let handleError manage specific db errors (like 409 conflict if category is in use)
            throw error;
        }

        // Check if exactly one row was deleted
        if (count === 0) {
            // This means either the ID didn't exist or RLS prevented access
            return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        }

        return handleSuccess(null, 204); // 204 No Content

    } catch (error) {
        // handleError will catch PostgrestError (e.g., 409 foreign key violation)
        return handleError(error);
    }
}
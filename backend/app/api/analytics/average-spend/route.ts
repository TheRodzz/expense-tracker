import { NextRequest } from 'next/server';
import { createSupabaseServerClientWithAuthHeader } from '@/lib/supabase/server';
import { GetAverageCategorySpendQuerySchema } from '@/lib/zod/schemas';
import { handleError, handleSuccess, handleAuthError } from '@/lib/supabase/utils';

// Define the expected structure of the result
interface AverageSpendResult {
    categoryId: string;
    categoryName: string;
    totalAmount: number;
    expenseCount: number;
    averageAmount: number;
    is_expense: boolean;
}

// Define the shape of the expense data fetched from the DB
interface ExpenseData {
    amount: number;
    category_id: string | null; // Only category_id is directly available
}

export async function GET(request: NextRequest) {
    try {
        const { supabase, user } = await createSupabaseServerClientWithAuthHeader(request);
        if (!supabase || !user) return handleAuthError();

        // Validate query parameters
        const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
        const validationResult = GetAverageCategorySpendQuerySchema.safeParse(queryParams);

        if (!validationResult.success) {
            throw validationResult.error;
        }
        const { startDate, endDate } = validationResult.data;

        // 1. Fetch expenses with category_id within the date range
        const { data: expenses, error: fetchError } = await supabase
            .from('expenses')
            .select(`
                amount,
                category_id
            `)
            .eq('user_id', user.id) // Ensure we only get user's expenses
            .gte('timestamp', startDate)
            .lte('timestamp', endDate);

        if (fetchError) throw fetchError;

        if (!expenses || expenses.length === 0) {
            return handleSuccess<AverageSpendResult[]>([]);
        }

        // 2. Fetch all categories for the user
        const { data: categories, error: categoryError } = await supabase
            .from('categories')
            .select('id, name, is_expense')
            .eq('user_id', user.id);

        if (categoryError) throw categoryError;

        // 3. Create a map for quick category lookup (name and is_expense flag)
        const categoryMap = new Map<string, { name: string; is_expense: boolean }>();
        categories?.forEach(cat => {
            if (cat.id && cat.name && typeof cat.is_expense === 'boolean') {
                categoryMap.set(cat.id, { name: cat.name, is_expense: cat.is_expense });
            }
        });

        // 4. Aggregate total amount and count per category (including non-expense categories)
        const summary = expenses.reduce<Record<string, { total: number; count: number; name: string }>>((acc, expense: ExpenseData) => {
            const categoryId = expense.category_id;
            const categoryInfo = categoryId ? categoryMap.get(categoryId) : null;

            // Check if categoryId exists and is in the map
            if (categoryId && categoryInfo) {
                const categoryName = categoryInfo.name;

                if (!acc[categoryId]) {
                    acc[categoryId] = { total: 0, count: 0, name: categoryName };
                }
                // Amount is already a number
                acc[categoryId].total += expense.amount;
                acc[categoryId].count += 1;
            }
            // Optionally log/handle expenses with null or unknown category_id

            return acc;
        }, {});

        // 5. Calculate average and format results
        const resultsArray: AverageSpendResult[] = Object.entries(summary).map(([categoryId, data]) => {
            const categoryInfo = categoryMap.get(categoryId);
            return {
                categoryId: categoryId,
                categoryName: data.name,
                totalAmount: parseFloat(data.total.toFixed(2)),
                expenseCount: data.count,
                averageAmount: parseFloat((data.total / data.count).toFixed(2)),
                is_expense: categoryInfo ? categoryInfo.is_expense : false,
            };
        });

        // Sort results by average amount descending
        resultsArray.sort((a, b) => b.averageAmount - a.averageAmount);

        return handleSuccess<AverageSpendResult[]>(resultsArray);

    } catch (error) {
        return handleError(error);
    }
} 
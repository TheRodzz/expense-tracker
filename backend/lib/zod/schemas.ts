// lib/zod/schemas.ts
import { z } from 'zod';

const UUIDSchema = z.string().uuid({ message: "Invalid UUID format" });

export const CategoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  is_expense: z.boolean({
    required_error: "Expense type is required",
    invalid_type_error: "Expense type must be true or false"
  }),
});

export type CategoryCreatePayload = z.infer<typeof CategoryCreateSchema>;

export const PaymentMethodCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  is_expense: z.boolean({
    required_error: "Expense type is required",
    invalid_type_error: "Expense type must be true or false",
  }),
});

export type PaymentMethodCreatePayload = z.infer<typeof PaymentMethodCreateSchema>;

export const ExpenseTypeEnum = z.enum(['Need', 'Want', 'Investment', 'Income']);

export const ExpenseCreateSchema = z.object({
    timestamp: z.string().datetime({ message: "Invalid ISO 8601 timestamp format" }),
    category_id: UUIDSchema,
    description: z.string().max(255, "Description cannot exceed 255 characters").optional().nullable(),
    amount: z.number().positive({ message: "Amount must be positive" }),
    payment_method_id: UUIDSchema,
    notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().nullable(),
    type: ExpenseTypeEnum,
});
export type ExpenseCreatePayload = z.infer<typeof ExpenseCreateSchema>;

export const ExpenseUpdateSchema = z.object({
    timestamp: z.string().datetime({ message: "Invalid ISO 8601 timestamp format" }).optional(),
    category_id: UUIDSchema.optional(),
    description: z.string().max(255, "Description cannot exceed 255 characters").optional().nullable(),
    amount: z.number().positive({ message: "Amount must be positive" }).optional(),
    payment_method_id: UUIDSchema.optional(),
    notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().nullable(),
    type: ExpenseTypeEnum.optional(),
}).refine(obj => Object.keys(obj).length > 0, {
    message: "At least one field must be provided for update", // Ensure body is not empty
});
export type ExpenseUpdatePayload = z.infer<typeof ExpenseUpdateSchema>;

// Schema for GET /expenses query parameters
export const GetExpensesQuerySchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    categoryId: UUIDSchema.optional(),
    paymentMethodId: UUIDSchema.optional(),
    type: ExpenseTypeEnum.optional(),
    skip: z
      .preprocess((val) => val === '' ? undefined : Number(val), z.number().int().min(0))
      .default(0),
    limit: z
      .preprocess((val) => val === '' ? undefined : Number(val), z.number().int().min(1).max(500))
      .default(100),
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      new Date(data.startDate).getTime() <= new Date(data.endDate).getTime(),
    {
      message: 'startDate must be less than or equal to endDate',
      path: ['startDate'], // This sets the error path to startDate
    }
  );

  

// Schema for GET /categories query parameters
export const GetCategoriesQuerySchema = z.object({
    skip: z
      .preprocess((val) => val === '' ? undefined : Number(val), z.number())
      .default(0),
    limit: z
      .preprocess((val) => val === '' ? undefined : Number(val), z.number())
      .default(100),
  });
  

// Schema for GET /payment_methods query parameters
export const GetPaymentMethodsQuerySchema = z.object({
  skip: z
    .preprocess((val) => val === '' ? undefined : Number(val), z.number().int().min(0))
    .default(0),
  limit: z
    .preprocess((val) => val === '' ? undefined : Number(val), z.number().int().min(1).max(500))
    .default(100),
});


// Schema for GET /analytics/summary query parameters
export const GetAnalyticsSummaryQuerySchema = z.object({
    startDate: z.string().datetime({ message: "startDate is required and must be a valid ISO 8601 date" }),
    endDate: z.string().datetime({ message: "endDate is required and must be a valid ISO 8601 date" }),
    groupBy: z.enum(['category', 'payment_method'], {
        errorMap: () => ({ message: "groupBy must be one of: 'category', 'payment_method'" })
    }),
});

// Schema for GET /analytics/average-spend query parameters
export const GetAverageCategorySpendQuerySchema = z.object({
    startDate: z.string().datetime({ message: "startDate is required and must be a valid ISO 8601 date" }),
    endDate: z.string().datetime({ message: "endDate is required and must be a valid ISO 8601 date" }),
});

// Schema for common date range and pagination
const DateRangePaginationSchema = z.object({
  startDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "startDate is required and must be a valid ISO 8601 date" }
  ),
  endDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "endDate is required and must be a valid ISO 8601 date" }
  ),
  skip: z.preprocess((val) => val === '' ? undefined : Number(val), z.number().int().min(0)).default(0),
  limit: z.preprocess((val) => val === '' ? undefined : Number(val), z.number().int().min(1).max(500)).default(100),
}).refine(
  (data) => new Date(data.startDate).getTime() <= new Date(data.endDate).getTime(),
  {
    message: 'startDate must be less than or equal to endDate',
    path: ['startDate'],
  }
);



// Schema for GET /expenses/category/{categoryId} and GET /expenses/payment-method/{paymentMethodId} query parameters
export const GetExpensesByRelationQuerySchema = DateRangePaginationSchema;

// Schema for path parameter validation
export const PathUUIDSchema = z.object({
    id: UUIDSchema, // Expecting the dynamic segment name, e.g., { categoryId: uuid } or { paymentMethodId: uuid }
});
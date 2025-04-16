# API Documentation

This document provides details about the available API endpoints for the Expenses application.

## Authentication

All API endpoints under `/api/`, except for `/api/auth/*`, require authentication. Authentication is handled via an HTTP-only cookie named `auth_token` (set automatically on login/signup). You do **not** need to send the JWT manually in headers or request bodies.

The backend reads the JWT from the `auth_token` cookie on each request. Ensure your client includes cookies in API requests (most browsers do this by default).

The middleware (`middleware.ts`) handles token validation. Unauthorized requests will receive a `401 Unauthorized` response.

## CSRF Protection

All state-changing API requests (`POST`, `PUT`, `PATCH`, `DELETE`) to `/api/*` (except `/api/auth/*`) require a valid CSRF token. This protects against cross-site request forgery attacks when the frontend and backend are hosted on different domains.

- On successful login or signup, the backend sets a `csrf_token` cookie (not HTTP-only, `SameSite=None; Secure`).
- The frontend **must** read the `csrf_token` cookie and include its value in the `X-CSRF-Token` header for all mutation requests.
- If the CSRF token is missing or invalid, the API will return a `403 Forbidden` error.
- The CSRF token is not required for `GET`, `OPTIONS`, or `/api/auth/*` endpoints.

**Example (frontend, using fetch):**
```js
const csrfToken = getCookie('csrf_token'); // Use your preferred cookie utility
fetch('/api/categories', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  credentials: 'include', // Important: send cookies
  body: JSON.stringify({ name: 'New Category' })
});
```

---

## Base URL

All API routes are relative to the application's base URL.

---

## Auth Endpoints

These endpoints handle user authentication. They do **not** require the `Authorization` header.

### 1. Sign Up

*   **Endpoint:** `POST /api/auth/signup`
*   **Description:** Creates a new user account.
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "your_secure_password"
    }
    ```
*   **Responses:**
    *   `201 Created`: Signup successful. If signup does not require email confirmation, the response body includes a message and user information, and an HTTP-only `auth_token` cookie is set for authentication. If email confirmation is required, the response prompts the user to check their email, and no cookie is set until confirmation.
    ```json
    {
      "message": "Signup successful. Check your email for confirmation (if enabled).",
      "user": { /* Supabase user object */ }
    }
    ```
    *   `400 Bad Request`: Missing email/password or signup failed (e.g., user already exists). Response body includes an error message.
    *   `500 Internal Server Error`: Unexpected server error.

### 2. Log In

*   **Endpoint:** `POST /api/auth/login`
*   **Description:** Authenticates a user. On success, sets an HTTP-only `auth_token` cookie containing a JWT for authentication.
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "your_password"
    }
    ```
*   **Responses:**
    *   `200 OK`: Login successful. Response body: `{ "success": true }`. The JWT is set as an HTTP-only cookie (`auth_token`).
    *   `400 Bad Request`: Missing email/password.
    *   `401 Unauthorized`: Invalid credentials or login failed. Response body includes an error message.
    *   `500 Internal Server Error`: Unexpected server error.

### 3. Log Out

*   **Endpoint:** `POST /api/auth/logout`
*   **Description:** Logs out the user by clearing the `auth_token` cookie.
*   **Responses:**
    *   `200 OK`: Logout successful. The authentication cookie is cleared.

---

## Category Endpoints

Endpoints for managing expense categories. Require authentication.

### 1. List Categories

*   **Endpoint:** `GET /api/categories`
*   **Description:** Retrieves categories belonging to the authenticated user. Categories are sorted by creation date (ascending).
*   **Query Parameters:** (Uses `GetCategoriesQuerySchema`)
    *   `skip` (number, optional, default: 0): Number of records to skip for pagination.
    *   `limit` (number, optional, default: 100): Maximum number of records to return (max 500).
*   **Responses:**
    *   `200 OK`: Returns an array of category objects.
    ```json
    [
      {
        "id": "uuid",
        "user_id": "uuid",
        "name": "Groceries",
        "created_at": "timestamp",
        "updated_at": "timestamp"
      },
      // ... more categories
    ]
    ```
    *   `401 Unauthorized`: Authentication failed.
    *   `500 Internal Server Error`: Database or other server error.

### 2. Create Category

*   **Endpoint:** `POST /api/categories`
*   **Description:** Creates a new category for the authenticated user.
*   **CSRF:** Requires the `X-CSRF-Token` header. See [CSRF Protection](#csrf-protection).
*   **Request Body:** (Uses `CategoryCreateSchema`)
    ```json
    {
      "name": "New Category Name"
    }
    ```
*   **Responses:**
    *   `201 Created`: Returns the newly created category object.
    ```json
    {
      "id": "new-uuid",
      "user_id": "user-uuid",
      "name": "New Category Name",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
    ```
    *   `400 Bad Request`: Invalid request body (validation error based on `CategoryCreateSchema`) or potentially failed database operation.
    *   `401 Unauthorized`: Authentication failed.
    *   `409 Conflict`: Category name might already exist (if there's a unique constraint).
    *   `500 Internal Server Error`: Database or other server error.

### 3. Update Category

*   **Endpoint:** `PATCH /api/categories/{id}`
*   **Description:** Updates the name of a specific category belonging to the authenticated user.
*   **Path Parameter:**
    *   `id` (UUID): The ID of the category to update.
*   **Request Body:** (Uses partial `CategoryCreateSchema`, only `name` is updatable)
    ```json
    {
      "name": "Updated Category Name"
    }
    ```
*   **Responses:**
    *   `200 OK`: Returns the updated category object.
    ```json
    {
      "id": "uuid",
      "user_id": "user-uuid",
      "name": "Updated Category Name",
      "created_at": "timestamp",
      "updated_at": "new-timestamp"
    }
    ```
    *   `400 Bad Request`: Invalid request body (validation error) or attempting to update fields other than `name`.
    *   `401 Unauthorized`: Authentication failed.
    *   `404 Not Found`: Category with the specified ID not found or doesn't belong to the user.
    *   `409 Conflict`: Updated name conflicts with an existing category name (if unique constraint exists).
    *   `500 Internal Server Error`: Database or other server error.

### 4. Delete Category

*   **Endpoint:** `DELETE /api/categories/{id}`
*   **Description:** Deletes a specific category belonging to the authenticated user.
*   **Path Parameter:**
    *   `id` (UUID): The ID of the category to delete.
*   **Responses:**
    *   `204 No Content`: Category deleted successfully.
    *   `401 Unauthorized`: Authentication failed.
    *   `404 Not Found`: Category with the specified ID not found or doesn't belong to the user.
    *   `409 Conflict`: Cannot delete category because it's referenced by existing expenses (foreign key constraint).
    *   `500 Internal Server Error`: Database or other server error.

---

## Payment Method Endpoints

Endpoints for managing payment methods. Require authentication.

### 1. List Payment Methods

*   **Endpoint:** `GET /api/payment_methods`
*   **Description:** Retrieves all payment methods belonging to the authenticated user. Methods are sorted by creation date (ascending).
*   **Query Parameters:** (Uses `GetPaymentMethodsQuerySchema`)
    *   `skip` (number, optional, default: 0): Number of records to skip for pagination.
    *   `limit` (number, optional, default: 100): Maximum number of records to return (max 500).
*   **Responses:**
    *   `200 OK`: Returns an array of payment method objects.
    ```json
    [
      {
        "id": "uuid",
        "user_id": "uuid",
        "name": "Credit Card",
        "created_at": "timestamp",
        "updated_at": "timestamp"
      },
      // ... more payment methods
    ]
    ```
    *   `401 Unauthorized`: Authentication failed.
    *   `500 Internal Server Error`: Database or other server error.

### 2. Create Payment Method

*   **Endpoint:** `POST /api/payment_methods`
*   **Description:** Creates a new payment method for the authenticated user.
*   **CSRF:** Requires the `X-CSRF-Token` header. See [CSRF Protection](#csrf-protection).
*   **Request Body:** (Uses `PaymentMethodCreateSchema`)
    ```json
    {
      "name": "New Payment Method Name"
    }
    ```
*   **Responses:**
    *   `201 Created`: Returns the newly created payment method object.
    ```json
    {
      "id": "new-uuid",
      "user_id": "user-uuid",
      "name": "New Payment Method Name",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
    ```
    *   `400 Bad Request`: Invalid request body (validation error based on `PaymentMethodCreateSchema`) or potentially failed database operation.
    *   `401 Unauthorized`: Authentication failed.
    *   `409 Conflict`: Payment method name might already exist (if there's a unique constraint).
    *   `500 Internal Server Error`: Database or other server error.

### 3. Update Payment Method

*   **Endpoint:** `PATCH /api/payment_methods/{id}`
*   **Description:** Updates the name of a specific payment method belonging to the authenticated user.
*   **Path Parameter:**
    *   `id` (UUID): The ID of the payment method to update.
*   **Request Body:** (Uses partial `PaymentMethodCreateSchema`, only `name` is updatable)
    ```json
    {
      "name": "Updated Payment Method Name"
    }
    ```
*   **Responses:**
    *   `200 OK`: Returns the updated payment method object.
    ```json
    {
      "id": "uuid",
      "user_id": "user-uuid",
      "name": "Updated Payment Method Name",
      "created_at": "timestamp",
      "updated_at": "new-timestamp"
    }
    ```
    *   `400 Bad Request`: Invalid request body (validation error) or attempting to update fields other than `name`.
    *   `401 Unauthorized`: Authentication failed.
    *   `404 Not Found`: Payment method with the specified ID not found or doesn't belong to the user.
    *   `409 Conflict`: Updated name conflicts with an existing payment method name (if unique constraint exists).
    *   `500 Internal Server Error`: Database or other server error.

### 4. Delete Payment Method

*   **Endpoint:** `DELETE /api/payment_methods/{id}`
*   **Description:** Deletes a specific payment method belonging to the authenticated user.
*   **Path Parameter:**
    *   `id` (UUID): The ID of the payment method to delete.
*   **Responses:**
    *   `204 No Content`: Payment method deleted successfully.
    *   `401 Unauthorized`: Authentication failed.
    *   `404 Not Found`: Payment method with the specified ID not found or doesn't belong to the user.
    *   `409 Conflict`: Cannot delete payment method because it's referenced by existing expenses (foreign key constraint).
    *   `500 Internal Server Error`: Database or other server error.

---

## Expense Endpoints

Endpoints for managing expenses. Require authentication.

### 1. List Expenses

*   **Endpoint:** `GET /api/expenses`
*   **Description:** Retrieves expenses belonging to the authenticated user, with optional filtering, sorting, and pagination.
*   **Query Parameters:** (Uses `GetExpensesQuerySchema`)
    *   `startDate` (ISO 8601 string, optional): Filter expenses on or after this date.
    *   `endDate` (ISO 8601 string, optional): Filter expenses on or before this date.
    *   `categoryId` (UUID, optional): Filter by category ID.
    *   `paymentMethodId` (UUID, optional): Filter by payment method ID.
    *   `type` ('income' | 'expense', optional): Filter by expense type.
    *   `skip` (number, optional, default: 0): Number of records to skip for pagination.
    *   `limit` (number, optional, default: 10): Maximum number of records to return.
*   **Sorting:** Default sort is by `timestamp` descending (newest first).
*   **Responses:**
    *   `200 OK`: Returns an array of expense objects matching the criteria.
    ```json
    [
      {
        "id": "uuid",
        "user_id": "uuid",
        "category_id": "uuid",
        "payment_method_id": "uuid",
        "amount": 100.50,
        "type": "expense", // or "income"
        "description": "Lunch",
        "timestamp": "timestamp",
        "created_at": "timestamp",
        "updated_at": "timestamp"
      },
      // ... more expenses
    ]
    ```
    *   `400 Bad Request`: Invalid query parameters (validation error based on `GetExpensesQuerySchema`).
    *   `401 Unauthorized`: Authentication failed.
    *   `500 Internal Server Error`: Database or other server error.

### 2. Create Expense

*   **Endpoint:** `POST /api/expenses`
*   **Description:** Creates a new expense record for the authenticated user.
*   **CSRF:** Requires the `X-CSRF-Token` header. See [CSRF Protection](#csrf-protection).
*   **Request Body:** (Uses `ExpenseCreateSchema`)
    ```json
    {
      "category_id": "category-uuid",
      "payment_method_id": "payment-method-uuid",
      "amount": 50.75,
      "type": "expense", // or "income"
      "description": "Coffee",
      "timestamp": "2023-10-27T10:00:00Z" // ISO 8601 format
    }
    ```
*   **Responses:**
    *   `201 Created`: Returns the newly created expense object.
    ```json
    {
        "id": "new-uuid",
        "user_id": "user-uuid",
        "category_id": "category-uuid",
        "payment_method_id": "payment-method-uuid",
        "amount": 50.75,
        "type": "expense",
        "description": "Coffee",
        "timestamp": "2023-10-27T10:00:00Z",
        "created_at": "timestamp",
        "updated_at": "timestamp"
    }
    ```
    *   `400 Bad Request`: Invalid request body (validation error) or invalid `category_id`/`payment_method_id` (foreign key violation).
    *   `401 Unauthorized`: Authentication failed.
    *   `404 Not Found`: Potentially if pre-checks for `category_id` or `payment_method_id` are implemented and they don't exist/belong to the user.
    *   `500 Internal Server Error`: Database or other server error.

### 3. Get Expense by ID

*   **Endpoint:** `GET /api/expenses/{id}`
*   **Description:** Retrieves a specific expense record by its ID, belonging to the authenticated user.
*   **Path Parameter:**
    *   `id` (UUID): The ID of the expense to retrieve.
*   **Responses:**
    *   `200 OK`: Returns the expense object.
    ```json
    {
        "id": "uuid",
        // ... other expense fields
    }
    ```
    *   `401 Unauthorized`: Authentication failed.
    *   `404 Not Found`: Expense with the specified ID not found or doesn't belong to the user.
    *   `500 Internal Server Error`: Database or other server error.

### 4. Update Expense

*   **Endpoint:** `PATCH /api/expenses/{id}`
*   **Description:** Updates specific fields of an expense record belonging to the authenticated user.
*   **Path Parameter:**
    *   `id` (UUID): The ID of the expense to update.
*   **Request Body:** (Uses `ExpenseUpdateSchema` - allows partial updates of fields defined in `ExpenseCreateSchema`)
    ```json
    {
      "amount": 60.00,
      "description": "Updated Coffee description"
      // ... other fields to update
    }
    ```
*   **Responses:**
    *   `200 OK`: Returns the updated expense object.
    ```json
    {
        "id": "uuid",
        "amount": 60.00,
        "description": "Updated Coffee description",
        // ... other fields, potentially updated timestamp
    }
    ```
    *   `400 Bad Request`: Invalid request body (validation error) or invalid `category_id`/`payment_method_id` if included (foreign key violation).
    *   `401 Unauthorized`: Authentication failed.
    *   `404 Not Found`: Expense with the specified ID not found or doesn't belong to the user.
    *   `500 Internal Server Error`: Database or other server error.

### 5. Delete Expense

*   **Endpoint:** `DELETE /api/expenses/{id}`
*   **Description:** Deletes a specific expense record belonging to the authenticated user.
*   **Path Parameter:**
    *   `id` (UUID): The ID of the expense to delete.
*   **Responses:**
    *   `204 No Content`: Expense deleted successfully.
    *   `401 Unauthorized`: Authentication failed.
    *   `404 Not Found`: Expense with the specified ID not found or doesn't belong to the user.
    *   `500 Internal Server Error`: Database or other server error.

### 6. Get Expenses by Category

*   **Endpoint:** `GET /api/expenses/category/{categoryId}`
*   **Description:** Retrieves expenses for a specific category within a date range, belonging to the authenticated user.
*   **Path Parameter:**
    *   `categoryId` (UUID): The ID of the category to filter expenses by.
*   **Query Parameters:** (Uses `GetExpensesByRelationQuerySchema`)
    *   `startDate` (ISO 8601 string): Start date for the period (required).
    *   `endDate` (ISO 8601 string): End date for the period (required).
    *   `skip` (number, optional, default: 0): Number of records to skip for pagination.
    *   `limit` (number, optional, default: 100): Maximum number of records to return (max 500).
*   **Sorting:** Default sort is by `timestamp` descending.
*   **Responses:**
    *   `200 OK`: Returns an array of expense objects matching the criteria.
    ```json
    [ { /* Expense object */ }, ... ]
    ```
    *   `400 Bad Request`: Invalid `categoryId` format or invalid/missing query parameters (`startDate`, `endDate`).
    *   `401 Unauthorized`: Authentication failed.
    *   `404 Not Found`: Potentially if the specified category doesn't exist or belong to the user (depending on implementation checks).
    *   `500 Internal Server Error`: Database or other server error.

### 7. Get Expenses by Payment Method

*   **Endpoint:** `GET /api/expenses/payment-method/{paymentMethodId}`
*   **Description:** Retrieves expenses for a specific payment method within a date range, belonging to the authenticated user.
*   **Path Parameter:**
    *   `paymentMethodId` (UUID): The ID of the payment method to filter expenses by.
*   **Query Parameters:** (Uses `GetExpensesByRelationQuerySchema`)
    *   `startDate` (ISO 8601 string): Start date for the period (required).
    *   `endDate` (ISO 8601 string): End date for the period (required).
    *   `skip` (number, optional, default: 0): Number of records to skip for pagination.
    *   `limit` (number, optional, default: 100): Maximum number of records to return (max 500).
*   **Sorting:** Default sort is by `timestamp` descending.
*   **Responses:**
    *   `200 OK`: Returns an array of expense objects matching the criteria.
    ```json
    [ { /* Expense object */ }, ... ]
    ```
    *   `400 Bad Request`: Invalid `paymentMethodId` format or invalid/missing query parameters (`startDate`, `endDate`).
    *   `401 Unauthorized`: Authentication failed.
    *   `404 Not Found`: Potentially if the specified payment method doesn't exist or belong to the user (depending on implementation checks).
    *   `500 Internal Server Error`: Database or other server error.

---

## Analytics Endpoints

Endpoints for retrieving summarized expense data. Require authentication.

### 1. Get Average Category Spend

*   **Endpoint:** `GET /api/analytics/average-spend`
*   **Description:** Retrieves the total expense amount, count, and average spending per category within a specified date range for the authenticated user.
*   **Query Parameters:** (Uses `GetAverageCategorySpendQuerySchema`)
    *   `startDate` (ISO 8601 string): Start date for the summary period (required).
    *   `endDate` (ISO 8601 string): End date for the summary period (required).
*   **Responses:**
    *   `200 OK`: Returns an array of summary objects, sorted by `averageAmount` descending.
    ```json
    [
      {
        "categoryId": "category-uuid",
        "categoryName": "Category Name",
        "totalAmount": 350.25, // Total expense amount for this category
        "expenseCount": 5,     // Number of expenses in this category
        "averageAmount": 70.05 // Average expense amount for this category (rounded)
      },
      // ... more categories
    ]
    ```
    *   `400 Bad Request`: Invalid or missing query parameters (`startDate`, `endDate`).
    *   `401 Unauthorized`: Authentication failed.
    *   `500 Internal Server Error`: Database or other server error.
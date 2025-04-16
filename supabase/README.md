# Supabase Database Setup

This project uses Supabase migrations to manage and version control the database schema. All schema changes are tracked as SQL migration files in the `migrations/` directory. This ensures database configuration is reproducible and consistent across all environments.

## How to Set Up the Database

### 1. Install Supabase CLI

If you haven't already, install the Supabase CLI globally:

```bash
npm install -g supabase
```

### 2. Link to Your Remote Supabase Project

If you haven't already, link your local project to your remote Supabase project:

```bash
supabase link --project-ref <your-project-ref>
```

You can find your `<your-project-ref>` in your Supabase project dashboard URL.

### 3. Apply Migrations to Remote Database

To apply all local migrations to your remote Supabase project, run:

```bash
supabase db push
```

This will apply all migrations in the `migrations/` directory to your remote database.

### 4. Pull Latest Remote Schema (Optional)

If you need to sync your local migrations with the remote Supabase project:

```bash
supabase db pull
```

This will generate new migration files reflecting the current remote schema.

---

## Local Development

To set up your local database using all tracked migrations, run:

```bash
supabase db reset
```

This will:
- Drop and recreate the local database
- Apply all migrations in order
- Seed the database if a `seed.sql` file is present

> **Note:** This will erase all existing data in your local database.

---

## Notes
- Do **not** apply raw SQL files or trigger functions manually. All changes should be managed through migrations.
- Keep the `migrations/` directory under version control for reproducibility.
- For advanced usage, see the [Supabase CLI documentation](https://supabase.com/docs/guides/cli).
- For more details on database setup, see the [main README](../README.md).

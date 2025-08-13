#!/bin/bash

echo "🔍 Supabase Database Connection Helper"
echo "======================================"
echo ""

echo "To run the migration, you need your Supabase database connection details."
echo ""

echo "📋 Required Information:"
echo "1. Database Host (from Supabase Dashboard)"
echo "2. Database Name (usually 'postgres')"
echo "3. Username (usually 'postgres')"
echo "4. Password (from Supabase Dashboard)"
echo ""

echo "📍 How to find these details:"
echo "1. Go to your Supabase project dashboard"
echo "2. Click on 'Settings' → 'Database'"
echo "3. Look for 'Connection string' or 'Connection info'"
echo "4. The host will look like: db.xxxxxxxxxxxxx.supabase.co"
echo ""

echo "💡 Example connection string format:"
echo "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres"
echo ""

echo "🚀 Once you have the details, you can run:"
echo ""

echo "# Option 1: Using connection string (recommended)"
echo "psql \"postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres\" -f risk-assessment-system-migration-supabase.sql"
echo ""

echo "# Option 2: Using individual parameters"
echo "psql -h [YOUR-HOST] -U postgres -d postgres -f risk-assessment-system-migration-supabase.sql"
echo ""

echo "# Option 3: Using environment variables"
echo "export PGPASSWORD=[YOUR-PASSWORD]"
echo "psql -h [YOUR-HOST] -U postgres -d postgres -f risk-assessment-system-migration-supabase.sql"
echo ""

echo "🔐 Security Note:"
echo "- Don't commit passwords to version control"
echo "- Use environment variables when possible"
echo "- The migration will create new tables and modify existing ones"
echo ""

echo "❓ Need help? Check your Supabase dashboard or run this script again."

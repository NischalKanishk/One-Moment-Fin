#!/bin/bash

# Check if we're in the right directory
if [ ! -f "add-compulsory-investment-questions.mjs" ]; then
    echo "❌ Error: add-compulsory-investment-questions.mjs not found in current directory"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "Please create a .env file with your Supabase credentials:"
    echo "  SUPABASE_URL=your_supabase_url"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js to run this migration"
    exit 1
fi

# Check if the required dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Dependencies check passed"
echo ""

# Check command line arguments
if [ "$1" = "test" ]; then
    echo "🧪 Running Database Connectivity Test..."
    echo ""
    
    if [ ! -f "test-compulsory-questions.mjs" ]; then
        echo "❌ Error: test-compulsory-questions.mjs not found"
        exit 1
    fi
    
    node test-compulsory-questions.mjs
    exit $?
fi

# Run the migration
echo "🚀 Running Compulsory Investment Questions Migration..."
echo ""

echo "🔧 Executing migration script..."
node add-compulsory-investment-questions.mjs

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Migration completed successfully!"
    echo ""
    echo "📋 What was added:"
    echo "   • Q1: What are your goals? (Multi-select)"
    echo "   • Q2: What is your Investment Horizon? (Single select)"
    echo "   • Q3: How much can you invest monthly? (Number input with Rs)"
    echo ""
    echo "✅ These questions now appear BEFORE the risk assessment questions"
    echo "✅ All existing forms have been updated with new versions"
    echo "✅ New forms will automatically include these questions"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

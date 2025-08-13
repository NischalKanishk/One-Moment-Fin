#!/bin/bash

# Risk Assessment System Setup Script
# This script helps set up the new risk assessment system

set -e

echo "🚀 Setting up Risk Assessment System for OneMFin"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the OneMFin project root directory"
    exit 1
fi

print_status "Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm/yarn is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "Prerequisites check passed"

# Check if .env file exists
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    print_warning "No .env file found. Please make sure you have configured your environment variables."
    print_status "You can copy from env.example: cp env.example .env"
fi

print_status "Installing dependencies..."

# Install frontend dependencies
if [ -f "package.json" ]; then
    print_status "Installing frontend dependencies..."
    npm install
    print_success "Frontend dependencies installed"
fi

# Install backend dependencies
if [ -d "backend" ]; then
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
fi

print_status "Setting up database..."

# Check if migration file exists
if [ ! -f "risk-assessment-system-migration.sql" ]; then
    print_error "Migration file not found: risk-assessment-system-migration.sql"
    exit 1
fi

if [ ! -f "seed-risk-assessment-data.sql" ]; then
    print_error "Seed data file not found: seed-risk-assessment-data.sql"
    exit 1
fi

print_status "Database migration and seed files found"

echo ""
echo "📋 Next Steps:"
echo "==============="
echo ""
echo "1. Validate migration (optional but recommended):"
echo "   psql -h your-host -U your-user -d your-database -f validate-migration.sql"
echo ""
echo "2. Run the database migration:"
echo "   # For Supabase (recommended):"
echo "   psql -h your-host -U your-user -d your-database -f risk-assessment-system-migration-supabase.sql"
echo "   # For other PostgreSQL:"
echo "   psql -h your-host -U your-user -d your-database -f risk-assessment-system-migration.sql"
echo ""
echo "3. Run the seed data script:"
echo "   psql -h your-host -U your-user -d your-database -f seed-risk-assessment-data.sql"
echo ""
echo "4. Start the backend server:"
echo "   cd backend && npm run dev"
echo ""
echo "5. Start the frontend development server:"
echo "   npm run dev"
echo ""
echo "6. Navigate to /app/assessments to see the new risk assessment system"
echo ""

print_status "Checking if backend can start..."

# Try to start backend in background to test
cd backend
if npm run build &> /dev/null; then
    print_success "Backend builds successfully"
else
    print_warning "Backend build failed. You may need to fix TypeScript errors first."
fi
cd ..

print_status "Checking if frontend can start..."

# Try to build frontend
if npm run build &> /dev/null; then
    print_success "Frontend builds successfully"
else
    print_warning "Frontend build failed. You may need to fix TypeScript errors first."
fi

echo ""
print_success "Setup script completed!"
echo ""
echo "🔧 Manual Steps Required:"
echo "========================="
echo "1. Run the SQL migration scripts on your database"
echo "2. Configure your environment variables"
echo "3. Start both backend and frontend servers"
echo ""
echo "📚 Documentation:"
echo "================="
echo "Check the docs/ folder for implementation details"
echo "The new system will be available at /app/assessments"
echo "Public assessments will be accessible at /a/{slug}"
echo ""
echo "🎯 Features Added:"
echo "=================="
echo "✅ Risk assessment frameworks (4 pre-configured)"
echo "✅ Question bank with 25+ questions"
echo "✅ Scoring engines (weighted_sum, three_pillar)"
echo "✅ Assessment snapshots and submissions"
echo "✅ Automatic lead creation from submissions"
echo "✅ Framework switching and configuration"
echo "✅ Public assessment forms"
echo "✅ Default assessment creation on signup"
echo ""
echo "Happy coding! 🚀"

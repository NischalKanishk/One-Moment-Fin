#!/bin/bash

# OneMFin User Deletion Setup Script
# This script helps set up the user deletion functionality

set -e

echo "🚀 Setting up OneMFin User Deletion Functionality"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the OneMFin project root directory"
    exit 1
fi

print_status "Found OneMFin project directory"

# Step 1: Check if database schema file exists
echo ""
echo "1️⃣ Checking database schema file..."
if [ -f "create-deprecated-users-database.sql" ]; then
    print_status "Database schema file found"
else
    print_error "Database schema file not found. Please ensure create-deprecated-users-database.sql exists"
    exit 1
fi

# Step 2: Check backend directory structure
echo ""
echo "2️⃣ Checking backend structure..."
if [ -d "backend/src/services" ]; then
    print_status "Backend services directory exists"
else
    print_error "Backend services directory not found"
    exit 1
fi

if [ -d "backend/src/routes" ]; then
    print_status "Backend routes directory exists"
else
    print_error "Backend routes directory not found"
    exit 1
fi

# Step 3: Check if required files exist
echo ""
echo "3️⃣ Checking required implementation files..."

required_files=(
    "backend/src/services/userDeletionService.ts"
    "backend/src/routes/clerkWebhooks.ts"
    "backend/src/routes/admin.ts"
    "backend/test-user-deletion.mjs"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "Found $file"
    else
        print_error "Missing required file: $file"
        exit 1
    fi
done

# Step 4: Check environment configuration
echo ""
echo "4️⃣ Checking environment configuration..."
if [ -f "backend/.env" ]; then
    print_status "Backend .env file exists"
    
    # Check for required environment variables
    if grep -q "CLERK_WEBHOOK_SECRET" backend/.env; then
        print_status "CLERK_WEBHOOK_SECRET is configured"
    else
        print_warning "CLERK_WEBHOOK_SECRET not found in .env file"
        print_info "Please add CLERK_WEBHOOK_SECRET=your_webhook_secret to backend/.env"
    fi
else
    print_warning "Backend .env file not found"
    print_info "Please copy backend/env.example to backend/.env and configure your values"
fi

# Step 5: Check if database migration has been run
echo ""
echo "5️⃣ Database setup instructions..."
print_info "To complete the setup, you need to run the database migration:"
echo ""
echo "   Option 1: Using psql directly"
echo "   psql -h YOUR_SUPABASE_HOST -U YOUR_USERNAME -d YOUR_DATABASE \\"
echo "     -f create-deprecated-users-database.sql"
echo ""
echo "   Option 2: Using Supabase Dashboard"
echo "   - Go to your Supabase project dashboard"
echo "   - Navigate to SQL Editor"
echo "   - Copy and paste the contents of create-deprecated-users-database.sql"
echo "   - Execute the script"
echo ""

# Step 6: Check Clerk webhook configuration
echo ""
echo "6️⃣ Clerk webhook configuration..."
print_info "In your Clerk Dashboard:"
echo "   1. Go to Webhooks section"
echo "   2. Create a new webhook endpoint"
echo "   3. Set URL to: https://your-domain.com/webhooks/clerk"
echo "   4. Select events: user.deleted, user.updated, user.created"
echo "   5. Copy the webhook secret to CLERK_WEBHOOK_SECRET"
echo ""

# Step 7: Check backend dependencies
echo ""
echo "7️⃣ Checking backend dependencies..."
cd backend

if [ -f "package.json" ]; then
    # Check if Clerk SDK is installed
    if grep -q "@clerk/clerk-sdk-node" package.json; then
        print_status "Clerk SDK is already installed"
    else
        print_warning "Clerk SDK not found in package.json"
        print_info "Run: npm install @clerk/clerk-sdk-node"
    fi
else
    print_error "Backend package.json not found"
    exit 1
fi

cd ..

# Step 8: Test setup
echo ""
echo "8️⃣ Testing setup..."
print_info "To test the implementation:"
echo "   1. Start your backend server"
echo "   2. Run the test script: cd backend && node test-user-deletion.mjs"
echo "   3. Check webhook endpoint: curl http://localhost:3001/webhooks/clerk/health"
echo "   4. Check admin endpoint: curl http://localhost:3001/api/admin/health"
echo ""

# Step 9: Final checklist
echo ""
echo "9️⃣ Final checklist..."
echo "   □ Database schema created (deprecated_* tables)"
echo "   □ Environment variables configured"
echo "   □ Clerk webhook endpoint configured"
echo "   □ Backend server running"
echo "   □ Test script executed successfully"
echo "   □ Webhook endpoint responding"
echo "   □ Admin endpoint accessible"
echo ""

print_status "Setup script completed!"
echo ""
print_info "Next steps:"
echo "   1. Run the database migration script"
echo "   2. Configure Clerk webhooks"
echo "   3. Test the implementation"
echo "   4. Deploy to production"
echo ""
print_info "For detailed instructions, see USER_DELETION_IMPLEMENTATION.md"
echo ""
print_info "Need help? Check the troubleshooting section in the documentation"

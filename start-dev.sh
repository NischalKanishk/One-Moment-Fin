#!/bin/bash

# Start development environment for OneMFin

echo "🚀 Starting OneMFin Development Environment..."

# Check if backend .env exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Backend .env file not found. Please create it with your environment variables."
    echo "   Copy backend/env.example to backend/.env and fill in the values."
    exit 1
fi

# Start backend in background
echo "🔧 Starting backend server on port 3001..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server on port 8080..."
echo "📝 Note: Frontend will use localhost:3001 for API calls"
VITE_API_URL=http://localhost:3001 npm run dev &
FRONTEND_PID=$!

echo "✅ Development environment started!"
echo "   Frontend: http://localhost:8080"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait

# Cleanup
echo "🛑 Stopping servers..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null
echo "✅ Servers stopped"

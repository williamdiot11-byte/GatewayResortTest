#!/bin/bash

# Supabase Schema Migration Script
# Run this after setting up your Supabase project

echo "🚀 Applying Supabase schema for Gateway Resort..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Apply schema
echo "📊 Creating tables and policies..."
supabase db push --db-url "$SUPABASE_DB_URL" < supabase-schema.sql

echo "✅ Schema applied successfully!"
echo ""
echo "Next steps:"
echo "1. Go to Supabase Dashboard → Table Editor"
echo "2. Verify that 'profiles', 'booking_metadata', and 'analytics_events' tables exist"
echo "3. Create your first admin user (see SETUP-GUIDE.md)"

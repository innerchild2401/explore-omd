# Database Migrations

This folder contains all database schema migrations for the Explore OMD platform.

## Migration History

### 00_initial_schema.sql
**Status:** ✅ Applied  
**Date:** October 25, 2025  
**Description:** Initial database schema setup

**Tables Created:**
- `omds` - Organization Management for Destinations
- `sections` - Dynamic page sections
- `businesses` - Hotels, restaurants, experiences
- `translations` - Multi-language content
- `user_profiles` - Extended user information
- `rooms` - Hotel rooms
- `hotel_reservations` - Hotel bookings
- `menu_items` - Restaurant menus
- `restaurant_orders` - Food orders with delivery
- `restaurant_reservations` - Table bookings
- `experience_availability` - Experience time slots
- `experience_bookings` - Experience reservations
- `customers` - Unified CRM
- `email_templates` - Email template management
- `email_logs` - Email sending tracking
- `reviews` - Business reviews and ratings

**Features:**
- UUID primary keys
- JSONB for flexible content storage
- Row Level Security (RLS) enabled
- Automatic updated_at triggers
- Performance indexes
- Cascading deletes
- Public read access for active content
- Seed data: "Constanta Tourism" OMD

## How to Apply Migrations

1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Copy contents of migration file
4. Paste and Run
5. Update this README with status

## Current Schema Version
**Version:** 1  
**Last Updated:** October 25, 2025


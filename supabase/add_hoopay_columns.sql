-- Add new columns to pix_payments table for Hoopay integration
-- Run this in Supabase SQL Editor

-- Add plan_id column to track which subscription plan
ALTER TABLE pix_payments ADD COLUMN IF NOT EXISTS plan_id TEXT;

-- Add payment_method column (pix or credit_card)
ALTER TABLE pix_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pix';

-- Add Hoopay order UUID for tracking
ALTER TABLE pix_payments ADD COLUMN IF NOT EXISTS hoopay_order_uuid TEXT;

-- Add Hoopay charge UUID
ALTER TABLE pix_payments ADD COLUMN IF NOT EXISTS hoopay_charge_uuid TEXT;

-- Add QR Code base64 for PIX payments
ALTER TABLE pix_payments ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT;

-- Add plan_id to premium_users for tracking which plan is active
ALTER TABLE premium_users ADD COLUMN IF NOT EXISTS plan_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pix_payments_hoopay_order_uuid ON pix_payments(hoopay_order_uuid);
CREATE INDEX IF NOT EXISTS idx_pix_payments_email ON pix_payments(email);

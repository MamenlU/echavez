-- Migration: Add google_id column to users table
-- Run this once in your MySQL client or via: mysql -u root echavez_web < migrations/add_google_id.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL UNIQUE AFTER phone_number,
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) NULL AFTER google_id;

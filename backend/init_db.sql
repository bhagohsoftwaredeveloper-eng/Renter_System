-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    student_phone VARCHAR(50),
    parent_phone VARCHAR(50),
    room_no VARCHAR(50),
    floor_no VARCHAR(50),
    unit VARCHAR(100),
    imd VARCHAR(100),
    has_fingerprint BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Pending',
    initials VARCHAR(10),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    can_generate_meal_ticket BOOLEAN DEFAULT FALSE,
    meal_ticket_expiration_date DATE,
    biometric_template TEXT,
    meal_type VARCHAR(20) DEFAULT 'Non-Veggie',
    registration_number VARCHAR(6) UNIQUE,
    meal_ticket_suspend_start DATE,
    meal_ticket_suspend_end DATE
);

-- Ensure all columns exist in registrations (for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='can_generate_meal_ticket') THEN
        ALTER TABLE registrations ADD COLUMN can_generate_meal_ticket BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='meal_ticket_expiration_date') THEN
        ALTER TABLE registrations ADD COLUMN meal_ticket_expiration_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='biometric_template') THEN
        ALTER TABLE registrations ADD COLUMN biometric_template TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='meal_type') THEN
        ALTER TABLE registrations ADD COLUMN meal_type VARCHAR(20) DEFAULT 'Non-Veggie';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='registration_number') THEN
        ALTER TABLE registrations ADD COLUMN registration_number VARCHAR(6) UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='meal_ticket_suspend_start') THEN
        ALTER TABLE registrations ADD COLUMN meal_ticket_suspend_start DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='meal_ticket_suspend_end') THEN
        ALTER TABLE registrations ADD COLUMN meal_ticket_suspend_end DATE;
    END IF;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    last_login TIMESTAMP,
    initials VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    password VARCHAR(255),
    username VARCHAR(255) NOT NULL UNIQUE,
    custom_permissions TEXT
);

-- Ensure custom_permissions and nullable email exist (for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='custom_permissions') THEN
        ALTER TABLE users ADD COLUMN custom_permissions TEXT;
    END IF;
    -- Make email nullable if it was NOT NULL before
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email' AND is_nullable='NO') THEN
        ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    END IF;
END $$;

-- Create meal_tickets table
CREATE TABLE IF NOT EXISTS meal_tickets (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER REFERENCES registrations(id),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    meal_type VARCHAR(50),
    renter_name VARCHAR(255)
);

-- Ensure meal_type and renter_name exist in meal_tickets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_tickets' AND column_name='meal_type') THEN
        ALTER TABLE meal_tickets ADD COLUMN meal_type VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_tickets' AND column_name='renter_name') THEN
        ALTER TABLE meal_tickets ADD COLUMN renter_name VARCHAR(255);
    END IF;
END $$;

-- Seed the default admin ONLY if no admin account exists.
-- This preserves existing users (and any changed admin password) during an update.
INSERT INTO users (name, email, role, status, initials, username, password)
SELECT 'Admin User', 'admin@secureaccess.io', 'Administrator', 'Active', 'AU', 'admin', '$2b$10$3eSyoWpQ2.Ym962FC5kJn.CqMYwVO1xe7KBeNkRGcHVi83pm.mROe'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Create access_logs table
CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    dept VARCHAR(100),
    point VARCHAR(100),
    location VARCHAR(100),
    type VARCHAR(50),
    status VARCHAR(20),
    date DATE DEFAULT CURRENT_DATE,
    time VARCHAR(50),
    avatar TEXT,
    push_status VARCHAR(50) DEFAULT 'Not Sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track push notification delivery status (for DBs created before this column existed)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='access_logs' AND column_name='push_status') THEN
        ALTER TABLE access_logs ADD COLUMN push_status VARCHAR(50) DEFAULT 'Not Sent';
    END IF;
END $$;

-- Create push_tokens table (Expo push tokens for the parent/student mobile app).
-- A registration may have several devices (parent phone, student phone, tablet),
-- so tokens live in their own table linked back to registrations.
CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER REFERENCES registrations(id) ON DELETE CASCADE,
    recipient_type VARCHAR(20),          -- 'parent' or 'student'
    expo_token VARCHAR(255) UNIQUE NOT NULL,
    platform VARCHAR(20),                -- 'android' / 'ios'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_registration ON push_tokens(registration_id);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    admin VARCHAR(255),
    admin_id VARCHAR(100),
    type VARCHAR(100),
    details TEXT,
    sub_details TEXT,
    status VARCHAR(20),
    date VARCHAR(50),
    time VARCHAR(50),
    initials VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed audit logs if empty
INSERT INTO audit_logs (admin, admin_id, type, details, sub_details, status, date, time, initials)
SELECT 'Sarah Adams', 'ADM-9021', 'User Management', 'Approved Renter ''John Doe''', 'Access Key: BK-4412-X', 'Success', 'Oct 24, 2023', '14:32:01 UTC', 'SA'
WHERE NOT EXISTS (SELECT 1 FROM audit_logs LIMIT 1);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default settings
-- Notification recipient toggles (notify student and/or parent)
INSERT INTO system_settings (key, value)
VALUES ('notify_parent_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value)
VALUES ('notify_student_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Push notification (Expo) toggle. When enabled, scans push to the mobile app.
INSERT INTO system_settings (key, value)
VALUES ('push_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Title/body templates for the push message. {name}, {mealType}, {time} are substituted.
INSERT INTO system_settings (key, value)
VALUES ('push_notification_title', 'Meal Ticket Used')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value)
VALUES ('push_notification_body', 'Hi! {name} used their {mealType} meal ticket at {time}.')
ON CONFLICT (key) DO NOTHING;

-- One-meal-per-period restriction (Breakfast / Lunch / Dinner)
-- Enabled by default: each user may claim only one ticket per meal service.
INSERT INTO system_settings (key, value)
VALUES ('meal_restriction_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value)
VALUES ('meal_window_breakfast', '5:00 AM-10:00 AM')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value)
VALUES ('meal_window_lunch', '11:00 AM-2:00 PM')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value)
VALUES ('meal_window_dinner', '5:00 PM-9:00 PM')
ON CONFLICT (key) DO NOTHING;

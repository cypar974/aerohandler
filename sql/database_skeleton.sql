-- ==================================================================
-- FLIGHT SCHOOL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ==================================================================
-- Description: 
-- This schema handles user roles (Student, Instructor, Pilot), 
-- fleet management, flight logging, billing, and maintenance tracking.
-- It utilizes PostgreSQL advanced features: Row Level Security (RLS) foundations,
-- polymorphic user associations, and complex triggers for automated bookkeeping.
-- ==================================================================

-- ==================================================================
-- 1. EXTENSIONS & CONFIGURATION
-- ==================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE SCHEMA IF NOT EXISTS api;

-- ==================================================================
-- 2. DOMAIN TYPES (ENUMS)
-- ==================================================================
CREATE TYPE user_role_enum AS ENUM ('student', 'instructor', 'regular_pilot', 'maintenance_technician', 'other_person');
CREATE TYPE booking_type_enum AS ENUM ('instruction', 'regular');
CREATE TYPE flight_type_enum AS ENUM ('EPI', 'EPFE', 'PI', 'P');
CREATE TYPE flight_nature_enum AS ENUM ('nav', 'loc', 'pat');
CREATE TYPE transaction_direction_enum AS ENUM ('receivable', 'payable');
CREATE TYPE transaction_status_enum AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_method_enum AS ENUM ('cash', 'card', 'transfer', 'check', 'other');
CREATE TYPE plane_category_enum AS ENUM ('SE', 'ME');
CREATE TYPE maintenance_status_enum AS ENUM ('Pending', 'In Progress', 'Completed', 'Cancelled');
CREATE TYPE plane_status_enum AS ENUM ('available', 'maintenance', 'out_of_service');

-- ==================================================================
-- 3. CORE TABLES
-- ==================================================================

-- Singleton for App Status
CREATE TABLE app_maintenance_status (
    singleton_id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton_id),
    is_maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    display_message TEXT DEFAULT 'System under maintenance.',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Polymorphic User Linker (Connects Auth to Profile Data)
CREATE TABLE users (
    id UUID PRIMARY KEY, -- Maps to Auth Provider UID
    role user_role_enum NOT NULL,
    person_id UUID NOT NULL, -- Logical FK to specific profile tables
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles: Students
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    address TEXT,
    student_number TEXT UNIQUE,
    membership_number TEXT UNIQUE,
    join_date DATE DEFAULT CURRENT_DATE,
    license_number TEXT,
    license_type TEXT,
    license_expiry DATE,
    medical_class TEXT,
    medical_expiry DATE,
    -- Flight counters
    total_hours NUMERIC DEFAULT 0,
    solo_hours NUMERIC DEFAULT 0,
    dual_hours NUMERIC DEFAULT 0,
    -- Document references (File storage paths)
    id_document_url TEXT,
    medical_certificate_url TEXT,
    license_scan_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Profiles: Instructors
CREATE TABLE instructors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    ratings TEXT,
    total_hours NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Profiles: Regular Pilots
CREATE TABLE regular_pilots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    ratings TEXT,
    total_hours NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Profiles: Maintenance Staff
CREATE TABLE maintenance_technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Profiles: Staff/Admin
CREATE TABLE other_person (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    person_role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Fleet Management
CREATE TABLE plane_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT UNIQUE NOT NULL,
    category plane_category_enum NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE planes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tail_number TEXT UNIQUE NOT NULL,
    model_id UUID REFERENCES plane_models(id),
    status plane_status_enum DEFAULT 'available',
    hours_flown NUMERIC DEFAULT 0,
    last_maintenance DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operations: Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plane_id UUID REFERENCES planes(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    pilot_id UUID REFERENCES users(id) ON DELETE CASCADE,
    booking_type booking_type_enum NOT NULL DEFAULT 'instruction',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    description TEXT,
    created_by UUID references users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operations: Flight Logs
CREATE TABLE flight_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_date DATE NOT NULL,
    plane_id UUID REFERENCES planes(id) ON DELETE CASCADE,
    type_of_flight flight_type_enum,
    nature_of_flight flight_nature_enum,
    pilot_uuid UUID REFERENCES users(id) ON DELETE CASCADE,
    instructor_uuid UUID REFERENCES users(id) ON DELETE SET NULL,
    departure_icao CHAR(4) NOT NULL,
    arrival_icao CHAR(4) NOT NULL,
    departure_time TIMESTAMPTZ NOT NULL,
    arrival_time TIMESTAMPTZ NOT NULL,
    flight_duration NUMERIC(7, 2), -- Calculated or manual
    -- Fuel Logic
    fuel_added_departure_liters NUMERIC(10, 2) DEFAULT 0 CHECK (fuel_added_departure_liters >= 0),
    fuel_added_arrival_liters NUMERIC(10, 2) DEFAULT 0 CHECK (fuel_added_arrival_liters >= 0),
    -- Engine Metrics
    hour_meter_departure NUMERIC(10, 2) NOT NULL,
    hour_meter_arrival NUMERIC(10, 2) NOT NULL,
    engine_oil_added_departure NUMERIC(6, 2) DEFAULT 0,
    -- Stats
    landings_count INTEGER NOT NULL,
    incidents_or_observations TEXT,
    signature_captain BOOLEAN DEFAULT FALSE,
    created_by UUID references users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_times_valid CHECK (arrival_time > departure_time)
);

-- Maintenance Records
CREATE TABLE maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plane_id UUID REFERENCES planes(id) ON DELETE CASCADE,
    due_hours NUMERIC,
    status maintenance_status_enum DEFAULT 'Pending',
    notes TEXT,
    cost DECIMAL(10, 2),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financials
CREATE TABLE billing_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES plane_models(id),
    rate_type VARCHAR(50) NOT NULL,
    rate_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_direction transaction_direction_enum NOT NULL,
    transaction_type TEXT NOT NULL,
    person_id UUID REFERENCES users(id),
    flight_log_id UUID REFERENCES flight_logs(id),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    due_date TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL,
    status transaction_status_enum DEFAULT 'pending',
    payment_method payment_method_enum,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_category TEXT NOT NULL,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    data_type TEXT NOT NULL DEFAULT 'text',
    is_public BOOLEAN DEFAULT false,
    options JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================
-- 4. ANALYTICAL VIEWS
-- ==================================================================

-- Unified Member View
CREATE OR REPLACE VIEW view_all_members AS
SELECT id, first_name, last_name, email, 'student' as type FROM students
UNION ALL SELECT id, first_name, last_name, email, 'instructor' as type FROM instructors
UNION ALL SELECT id, first_name, last_name, email, 'regular_pilot' as type FROM regular_pilots
UNION ALL SELECT id, first_name, last_name, email, 'maintenance_technician' as type FROM maintenance_technicians
UNION ALL SELECT id, first_name, last_name, email, 'other_person' as type FROM other_person;

-- Ledger View (Joins transactions to polymorphic users)
CREATE OR REPLACE VIEW view_financial_ledger AS
SELECT
    ft.id as transaction_id, ft.created_at, ft.due_date, ft.amount, ft.transaction_direction,
    ft.transaction_type, ft.status, ft.description, u.role as user_role,
    -- Polymorphic name resolution
    CASE
        WHEN u.role = 'student' THEN s.first_name || ' ' || s.last_name
        WHEN u.role = 'instructor' THEN i.first_name || ' ' || i.last_name
        WHEN u.role = 'regular_pilot' THEN rp.first_name || ' ' || rp.last_name
        WHEN u.role = 'maintenance_technician' THEN mt.first_name || ' ' || mt.last_name
        WHEN u.role = 'other_person' THEN op.first_name || ' ' || op.last_name
        ELSE 'Unknown'
    END as full_name,
    ft.flight_log_id, p.tail_number as related_plane
FROM financial_transactions ft
LEFT JOIN users u ON ft.person_id = u.id
LEFT JOIN students s ON u.person_id = s.id AND u.role = 'student'
LEFT JOIN instructors i ON u.person_id = i.id AND u.role = 'instructor'
LEFT JOIN regular_pilots rp ON u.person_id = rp.id AND u.role = 'regular_pilot'
LEFT JOIN maintenance_technicians mt ON u.person_id = mt.id AND u.role = 'maintenance_technician'
LEFT JOIN other_person op ON u.person_id = op.id AND u.role = 'other_person'
LEFT JOIN flight_logs fl ON ft.flight_log_id = fl.id
LEFT JOIN planes p ON fl.plane_id = p.id;

-- ==================================================================
-- 5. BUSINESS LOGIC & TRIGGERS
-- ==================================================================

-- 5.1 Update "Updated_At" timestamps automatically
CREATE OR REPLACE FUNCTION generic_update_updated_at() RETURNS TRIGGER AS $$ 
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; 
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_upd_students BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION generic_update_updated_at();
-- (Repeat for other tables...)

-- 5.2 Plane Maintenance Logic (Updates Total Airframe Hours)
CREATE OR REPLACE FUNCTION update_plane_hours_maintenance_logic() RETURNS TRIGGER AS $$ 
DECLARE diff NUMERIC;
BEGIN 
  IF (TG_OP = 'INSERT') THEN 
    diff := NEW.hour_meter_arrival - NEW.hour_meter_departure;
    UPDATE planes SET hours_flown = hours_flown + diff, updated_at = NOW() WHERE id = NEW.plane_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN 
    diff := OLD.hour_meter_arrival - OLD.hour_meter_departure;
    UPDATE planes SET hours_flown = hours_flown - diff, updated_at = NOW() WHERE id = OLD.plane_id;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN 
    diff := (NEW.hour_meter_arrival - NEW.hour_meter_departure) - (OLD.hour_meter_arrival - OLD.hour_meter_departure);
    IF diff != 0 THEN UPDATE planes SET hours_flown = hours_flown + diff, updated_at = NOW() WHERE id = NEW.plane_id; END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_maintain_plane_hours AFTER INSERT OR UPDATE OR DELETE ON flight_logs FOR EACH ROW EXECUTE FUNCTION update_plane_hours_maintenance_logic();

-- 5.3 Pilot Logbook Logic (Updates Pilot's Total Hours)
CREATE OR REPLACE FUNCTION update_person_hours_after_flight() RETURNS TRIGGER AS $$ 
DECLARE 
    p_role user_role_enum; 
    flight_hours NUMERIC;
    pid UUID;
    iid UUID;
BEGIN 
    flight_hours := NEW.hour_meter_arrival - NEW.hour_meter_departure;

    -- Update Pilot
    IF NEW.pilot_uuid IS NOT NULL THEN 
        SELECT role, person_id INTO p_role, pid FROM users WHERE id = NEW.pilot_uuid;
        IF p_role = 'student'::user_role_enum THEN UPDATE students SET total_hours = total_hours + flight_hours WHERE id = pid;
        ELSIF p_role = 'instructor'::user_role_enum THEN UPDATE instructors SET total_hours = total_hours + flight_hours WHERE id = pid;
        ELSIF p_role = 'regular_pilot'::user_role_enum THEN UPDATE regular_pilots SET total_hours = total_hours + flight_hours WHERE id = pid;
        END IF;
    END IF;

    -- Update Instructor
    IF NEW.instructor_uuid IS NOT NULL THEN
        SELECT person_id INTO iid FROM users WHERE id = NEW.instructor_uuid;
        UPDATE instructors SET total_hours = total_hours + flight_hours WHERE id = iid;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_person_hours_after_flight AFTER INSERT ON flight_logs FOR EACH ROW EXECUTE FUNCTION update_person_hours_after_flight();

-- 5.4 Conflict Prevention (Double Booking)
CREATE OR REPLACE FUNCTION prevent_double_booking() RETURNS TRIGGER AS $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM bookings WHERE plane_id = NEW.plane_id AND id != NEW.id AND tstzrange(start_time, end_time) && tstzrange(NEW.start_time, NEW.end_time)) 
    THEN RAISE EXCEPTION 'Plane is already booked for this time slot.'; END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_double_booking BEFORE INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION prevent_double_booking();

-- ==================================================================
-- 6. API LAYER (Selected Examples)
-- ==================================================================

-- Auth Helper Wrapper (Implementation abstracted for security)
CREATE OR REPLACE FUNCTION public._create_auth_user_send_reset(in_email TEXT, in_role TEXT) 
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$ 
BEGIN 
  -- NOTE: In production, this interacts with the Auth Provider (e.g., Supabase Auth/GoTrue).
  -- It creates a user in the auth schema and returns the UUID.
  -- Detailed implementation hidden for public repo.
  RAISE EXCEPTION 'This function requires an active Auth Provider connection.';
END;
$$;

-- Example: Create Student API
CREATE OR REPLACE FUNCTION api.insert_student(payload JSONB) RETURNS students LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_auth_id UUID; new_person_id UUID; created_student students;
BEGIN
    -- 1. Create Identity
    SELECT auth_uid, person_id INTO new_auth_id, new_person_id 
    FROM public.create_student(payload ->> 'first_name', payload ->> 'last_name', payload ->> 'email');
    
    -- 2. Update Profile Details
    UPDATE students 
    SET phone = payload ->> 'phone', address = payload ->> 'address', student_number = payload ->> 'student_number' 
    WHERE id = new_person_id 
    RETURNING * INTO created_student;
    
    RETURN created_student;
END; $$;

-- Example: Get Enriched Bookings
CREATE OR REPLACE FUNCTION api.get_bookings_enriched(start_date_range TIMESTAMPTZ, end_date_range TIMESTAMPTZ) 
RETURNS TABLE (id UUID, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, plane_tail_number TEXT, instructor_name TEXT, pilot_name TEXT, booking_type TEXT, status TEXT) 
LANGUAGE plpgsql SECURITY DEFINER AS $$ 
BEGIN RETURN QUERY 
SELECT 
    b.id, b.start_time, b.end_time, p.tail_number, 
    (inst.first_name || ' ' || inst.last_name) as instructor, 
    (pl.first_name || ' ' || pl.last_name) as pilot, 
    b.booking_type::TEXT, 
    CASE WHEN b.end_time < NOW() THEN 'completed' ELSE 'upcoming' END
FROM bookings b 
JOIN planes p ON b.plane_id = p.id 
LEFT JOIN view_all_members inst ON b.instructor_id = (SELECT id FROM users WHERE person_id = inst.id AND role = 'instructor') 
LEFT JOIN view_all_members pl ON b.pilot_id = (SELECT id FROM users WHERE person_id = pl.id)
WHERE b.start_time >= start_date_range AND b.end_time <= end_date_range 
ORDER BY b.start_time ASC; END; $$;
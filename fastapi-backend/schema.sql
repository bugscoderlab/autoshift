-- AutoShift Hospital Roster Database Schema
-- Compatible with TiDB / MySQL

-- Create database
CREATE DATABASE IF NOT EXISTS hospital_roster;
USE hospital_roster;

-- Weekly Fixed Pattern table
CREATE TABLE IF NOT EXISTS weeklyfixedpattern (
    pattern_id INT AUTO_INCREMENT PRIMARY KEY,
    pattern_name VARCHAR(100) NOT NULL,
    week_number INT NOT NULL CHECK (week_number >= 1 AND week_number <= 4),
    day_1 VARCHAR(20),  -- Monday
    day_2 VARCHAR(20),  -- Tuesday
    day_3 VARCHAR(20),  -- Wednesday
    day_4 VARCHAR(20),  -- Thursday
    day_5 VARCHAR(20),  -- Friday
    day_6 VARCHAR(20),  -- Saturday
    day_7 VARCHAR(20)   -- Sunday
);

-- Doctor table (unified for fixed and flexible)
CREATE TABLE IF NOT EXISTS doctor (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    category ENUM('fixed', 'flexible') DEFAULT 'flexible',
    department VARCHAR(50) DEFAULT 'General',
    role VARCHAR(50) DEFAULT 'Medical Officer',
    join_date DATE NOT NULL,
    leave_date DATE,
    fte DECIMAL(3,2) DEFAULT 1.00,
    active BOOLEAN DEFAULT TRUE,
    weekly_fixed_pattern_id INT,
    FOREIGN KEY (weekly_fixed_pattern_id) REFERENCES weeklyfixedpattern(pattern_id),
    INDEX idx_doctor_category (category),
    INDEX idx_doctor_active (active),
    INDEX idx_doctor_department (department)
);

-- Monthly Roster table
CREATE TABLE IF NOT EXISTS monthlyroster (
    roster_id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    doctor_id INT NOT NULL,
    shift_type ENUM('morning', 'afternoon', 'evening', 'night', 'resus', 'edx', 'auc', 'off') NOT NULL,
    source ENUM('auto', 'manual', 'fixed-pattern', 'swap', 'request') DEFAULT 'auto',
    start_time VARCHAR(5),
    end_time VARCHAR(5),
    notes TEXT,
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id),
    INDEX idx_roster_date (date),
    INDEX idx_roster_doctor (doctor_id),
    UNIQUE KEY uk_roster_date_doctor (date, doctor_id)
);

-- Leave table
CREATE TABLE IF NOT EXISTS leave_table (
    leave_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type ENUM('annual', 'medical', 'emergency', 'maternity', 'paternity', 'unpaid', 'other') DEFAULT 'annual',
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    invite_coverage BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_by INT,
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id),
    FOREIGN KEY (approved_by) REFERENCES doctor(doctor_id),
    INDEX idx_leave_doctor (doctor_id),
    INDEX idx_leave_status (status),
    INDEX idx_leave_dates (start_date, end_date)
);

-- Shift Request table
CREATE TABLE IF NOT EXISTS shiftrequest (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    date DATE NOT NULL,
    shift_type ENUM('morning', 'afternoon', 'evening', 'night', 'resus', 'edx', 'auc') NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_by INT,
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id),
    FOREIGN KEY (approved_by) REFERENCES doctor(doctor_id),
    INDEX idx_request_doctor (doctor_id),
    INDEX idx_request_status (status)
);

-- Swap Request table
CREATE TABLE IF NOT EXISTS swaprequest (
    swap_id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    requester_shift_date DATE NOT NULL,
    requester_shift_type VARCHAR(20) NOT NULL,
    target_id INT,
    target_shift_date DATE,
    target_shift_type VARCHAR(20),
    is_broadcast BOOLEAN DEFAULT FALSE,
    reason TEXT,
    status ENUM('pending', 'accepted', 'rejected', 'cancelled', 'expired') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    accepted_by INT,
    accepted_at TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES doctor(doctor_id),
    FOREIGN KEY (target_id) REFERENCES doctor(doctor_id),
    FOREIGN KEY (accepted_by) REFERENCES doctor(doctor_id),
    INDEX idx_swap_requester (requester_id),
    INDEX idx_swap_status (status)
);

-- Views for common queries

-- View: Active doctors summary
CREATE OR REPLACE VIEW v_active_doctors AS
SELECT 
    d.doctor_id,
    d.name,
    d.email,
    d.category,
    d.department,
    d.role,
    d.fte,
    p.pattern_name as fixed_pattern
FROM doctor d
LEFT JOIN weeklyfixedpattern p ON d.weekly_fixed_pattern_id = p.pattern_id
WHERE d.active = TRUE;

-- View: Monthly roster with doctor names
CREATE OR REPLACE VIEW v_roster_with_doctors AS
SELECT 
    r.roster_id,
    r.date,
    r.shift_type,
    r.source,
    r.start_time,
    r.end_time,
    d.doctor_id,
    d.name as doctor_name,
    d.department,
    d.category
FROM monthlyroster r
JOIN doctor d ON r.doctor_id = d.doctor_id;

-- View: Pending requests summary
CREATE OR REPLACE VIEW v_pending_requests AS
SELECT 
    'leave' as request_type,
    l.leave_id as request_id,
    l.doctor_id,
    d.name as doctor_name,
    l.start_date,
    l.end_date,
    l.leave_type as details,
    l.created_at
FROM leave_table l
JOIN doctor d ON l.doctor_id = d.doctor_id
WHERE l.status = 'pending'
UNION ALL
SELECT 
    'shift' as request_type,
    s.request_id,
    s.doctor_id,
    d.name as doctor_name,
    s.date as start_date,
    s.date as end_date,
    s.shift_type as details,
    s.created_at
FROM shiftrequest s
JOIN doctor d ON s.doctor_id = d.doctor_id
WHERE s.status = 'pending'
UNION ALL
SELECT 
    'swap' as request_type,
    sw.swap_id as request_id,
    sw.requester_id as doctor_id,
    d.name as doctor_name,
    sw.requester_shift_date as start_date,
    sw.requester_shift_date as end_date,
    sw.requester_shift_type as details,
    sw.created_at
FROM swaprequest sw
JOIN doctor d ON sw.requester_id = d.doctor_id
WHERE sw.status = 'pending';




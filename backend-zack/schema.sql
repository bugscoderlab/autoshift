-- TiDB/MySQL Schema for Hospital Roster Management System
-- This schema is MySQL-compatible for TiDB

-- Doctor table (unified for both fixed and flexible doctors)
CREATE TABLE IF NOT EXISTS doctor (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category ENUM('fixed', 'flexible') NOT NULL,
    join_date DATE NOT NULL,
    leave_date DATE NULL,
    fte DECIMAL(3, 2) DEFAULT 1.00 CHECK (fte >= 0.00 AND fte <= 1.00),
    active BOOLEAN DEFAULT TRUE,
    weekly_fixed_pattern_id INT NULL,
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_active (active),
    FOREIGN KEY (weekly_fixed_pattern_id) REFERENCES weekly_fixed_pattern(pattern_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Weekly fixed pattern table
CREATE TABLE IF NOT EXISTS weekly_fixed_pattern (
    pattern_id INT AUTO_INCREMENT PRIMARY KEY,
    week_number INT NOT NULL CHECK (week_number >= 1 AND week_number <= 4),
    day_1 ENUM('Resus', 'EDx', 'AUC', 'Off', 'Leave') DEFAULT 'Off',
    day_2 ENUM('Resus', 'EDx', 'AUC', 'Off', 'Leave') DEFAULT 'Off',
    day_3 ENUM('Resus', 'EDx', 'AUC', 'Off', 'Leave') DEFAULT 'Off',
    day_4 ENUM('Resus', 'EDx', 'AUC', 'Off', 'Leave') DEFAULT 'Off',
    day_5 ENUM('Resus', 'EDx', 'AUC', 'Off', 'Leave') DEFAULT 'Off',
    day_6 ENUM('Resus', 'EDx', 'AUC', 'Off', 'Leave') DEFAULT 'Off',
    day_7 ENUM('Resus', 'EDx', 'AUC', 'Off', 'Leave') DEFAULT 'Off',
    INDEX idx_week_number (week_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Monthly roster table
CREATE TABLE IF NOT EXISTS monthly_roster (
    roster_id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    doctor_id INT NOT NULL,
    shift_type ENUM('Resus', 'EDx', 'AUC', 'Off', 'Leave') NOT NULL,
    source ENUM('auto', 'manual', 'fixed-pattern') DEFAULT 'auto',
    INDEX idx_date (date),
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_shift_type (shift_type),
    INDEX idx_source (source),
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leave table
CREATE TABLE IF NOT EXISTS leave (
    leave_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    date DATE NOT NULL,
    leave_type ENUM('annual', 'sick', 'personal', 'other') DEFAULT 'annual',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_date (date),
    INDEX idx_status (status),
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shift requests table
CREATE TABLE IF NOT EXISTS shift_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    date DATE NOT NULL,
    shift_type ENUM('Resus', 'EDx', 'AUC', 'Off', 'Leave') NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_date (date),
    INDEX idx_status (status),
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


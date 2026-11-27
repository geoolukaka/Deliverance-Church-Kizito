-- ==========================================================
-- Deliverance Church International, Kizito — MySQL Schema
-- Currency used throughout: Kenya Shillings (KES)
-- Run: mysql -u root -p < schema.sql
-- ==========================================================

CREATE DATABASE IF NOT EXISTS dic_kizito
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE dic_kizito;

-- ----------------------------------------------------------
-- Members / users (church members + admins)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('member', 'leader', 'admin', 'pastor') NOT NULL DEFAULT 'member',
  group_slug VARCHAR(40) NULL, -- for role 'leader': 'men', 'women', 'youth', 'fellowship-7' ...
  join_date DATE DEFAULT (CURRENT_DATE),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Small groups / ministries members can belong to
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  meeting_day VARCHAR(30),
  meeting_time VARCHAR(30),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS group_members (
  group_id INT NOT NULL,
  member_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, member_id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Ministries (about page / leadership area, informational)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ministries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  leader_name VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Events
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  location VARCHAR(200),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_attendees (
  event_id INT NOT NULL,
  member_id INT NOT NULL,
  role VARCHAR(50) DEFAULT 'Attendee',
  PRIMARY KEY (event_id, member_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Sermons
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sermons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  speaker VARCHAR(150) NOT NULL,
  sermon_date DATE NOT NULL,
  scripture_reference VARCHAR(150),
  video_url VARCHAR(500),
  audio_url VARCHAR(500),
  notes_url VARCHAR(500),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Donations (tithes / offerings) — amount always in KES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS donations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NULL,
  donor_name VARCHAR(150) NOT NULL,
  donor_email VARCHAR(150),
  donor_phone VARCHAR(20),
  fund ENUM('tithe','offering','building','missions','welfare','other') NOT NULL DEFAULT 'tithe',
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'KES',
  payment_method ENUM('mpesa','card','cash','bank') NOT NULL DEFAULT 'mpesa',
  mpesa_merchant_request_id VARCHAR(100),
  mpesa_checkout_request_id VARCHAR(100),
  mpesa_receipt_number VARCHAR(50),
  status ENUM('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  status_message VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
  INDEX idx_donations_member (member_id),
  INDEX idx_donations_status (status),
  UNIQUE INDEX idx_donations_checkout (mpesa_checkout_request_id),
  INDEX idx_donations_phone (donor_phone, created_at)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Contact form submissions
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('new','read','responded') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Newsletters & articles
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('newsletter','article') NOT NULL DEFAULT 'article',
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  excerpt VARCHAR(400),
  body MEDIUMTEXT NOT NULL,
  author VARCHAR(120) DEFAULT 'DCI Kizito',
  cover_url VARCHAR(500),
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Group pages (men, women, youth, fellowship-1..20, ...)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_slug VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NULL,
  location VARCHAR(200),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_group_events (group_slug, event_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS group_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_slug VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  author_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_group_posts (group_slug, created_at)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Seed data (safe to remove)
-- ----------------------------------------------------------
INSERT INTO groups (name, meeting_day, meeting_time, description) VALUES
  ('Women''s Bible Study', 'Wednesday', '7:00 PM', 'A weekly study for women of all ages.'),
  ('Sunday Choir', 'Thursday', '6:30 PM', 'Worship team rehearsal.')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO events (title, description, location, event_date, start_time, end_time) VALUES
  ('Sunday Worship Service', 'Weekly worship service.', 'Main Sanctuary', CURDATE() + INTERVAL (7 - WEEKDAY(CURDATE())) DAY, '10:00:00', '12:00:00'),
  ('Midweek Bible Study', 'Weekly Bible study.', 'Fellowship Hall', CURDATE() + INTERVAL 3 DAY, '19:00:00', '20:30:00');

INSERT INTO sermons (title, speaker, sermon_date, scripture_reference, description) VALUES
  ('Walking in Purpose', 'Rev. Crispus Kinene', CURDATE() - INTERVAL 7 DAY, 'Jeremiah 29:11', 'Discovering God''s purpose for your life.'),
  ('The Power of Community', 'Rev. Crispus Kinene', CURDATE() - INTERVAL 14 DAY, 'Acts 2:42-47', 'Why the church family matters.'),
  ('Faith Over Fear', 'Rev. Crispus Kinene', CURDATE() - INTERVAL 21 DAY, 'Isaiah 41:10', 'Standing firm in faith during uncertain times.');

-- Make someone a group leader (can update only their own group page):
-- UPDATE members SET role='leader', group_slug='women' WHERE email='leader@example.com';

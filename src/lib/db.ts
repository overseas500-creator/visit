import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'visitors.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize the database table
db.exec(`
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    id_number TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    visit_date TEXT NOT NULL,
    visit_time TEXT NOT NULL,
    purpose TEXT NOT NULL,
    signature TEXT, -- Base64 string for signature
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS otp_codes (
    mobile_number TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

// Initialize default settings
const defaults = [
  { key: 'admin_password', value: '1245' },
  { key: 'school_country', value: 'المملكة العربية السعودية' },
  { key: 'school_ministry', value: 'وزارة التعليم' },
  { key: 'school_directorate', value: 'الإدارة العامة للتعليم بمحافظة جدة' },
  { key: 'school_name', value: 'مدرسة الأجاويد الأولى المتوسطة' },
];

const checkStmt = db.prepare("SELECT value FROM settings WHERE key = ?");
const insertStmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");

defaults.forEach(setting => {
  if (!checkStmt.get(setting.key)) {
    insertStmt.run(setting.key, setting.value);
  }
});

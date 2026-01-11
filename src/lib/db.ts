import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'visitors.db');

// Use a global variable to store the database instance in development
// This prevents multiple connections during hot reloading
const globalForDb = global as unknown as { db?: Database.Database };

export const db = globalForDb.db || new Database(dbPath);

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

// Initialize the database tables
const initDb = () => {
  try {
    console.log("Initializing Database Tables...");
    db.exec(`
          CREATE TABLE IF NOT EXISTS visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            id_number TEXT NOT NULL,
            mobile_number TEXT NOT NULL,
            visit_date TEXT NOT NULL,
            visit_time TEXT NOT NULL,
            purpose TEXT NOT NULL,
            signature TEXT,
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

    db.exec(`
          CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            grade TEXT NOT NULL,
            class_name TEXT NOT NULL,
            id_number TEXT NOT NULL UNIQUE,
            mobile_number TEXT NOT NULL
          )
        `);

    db.exec(`
          CREATE TABLE IF NOT EXISTS student_exits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            reason TEXT NOT NULL,
            authorizer TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            exit_time DATETIME,
            FOREIGN KEY(student_id) REFERENCES students(id)
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
  } catch (error) {
    console.error("Database initialization error:", error);
  }
};

// Run initialization
initDb();

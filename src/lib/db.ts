import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

const dbPath = path.join(process.cwd(), 'visitors.db');

// Global cache for development
const globalForDb = global as unknown as { dbPromise?: Promise<Database> };

// Helper to initialize the DB connection
const initDbConnection = async (): Promise<Database> => {
  if (globalForDb.dbPromise) return globalForDb.dbPromise;

  const promise = open({
    filename: dbPath,
    driver: sqlite3.Database
  }).then(async (db) => {
    // Enable foreign keys
    await db.run('PRAGMA foreign_keys = ON');
    return db;
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.dbPromise = promise;
  }
  return promise;
};

// Export a function to get the DB instance
export const getDb = initDbConnection;

// Initialize tables
const initTables = async () => {
  try {
    const db = await getDb();
    console.log("Initializing Database Tables...");

    await db.exec(`
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

    await db.exec(`
          CREATE TABLE IF NOT EXISTS otp_codes (
            mobile_number TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            expires_at DATETIME NOT NULL
          )
        `);

    await db.exec(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          )
        `);

    await db.exec(`
          CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            grade TEXT NOT NULL,
            class_name TEXT NOT NULL,
            id_number TEXT NOT NULL UNIQUE,
            mobile_number TEXT NOT NULL
          )
        `);

    await db.exec(`
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

    for (const setting of defaults) {
      const existing = await db.get("SELECT value FROM settings WHERE key = ?", setting.key);
      if (!existing) {
        await db.run("INSERT INTO settings (key, value) VALUES (?, ?)", setting.key, setting.value);
      }
    }
  } catch (error) {
    console.error("Database initialization error:", error);
  }
};

// Start initialization (fire and forget, but ideally should be awaited in entry point)
initTables();



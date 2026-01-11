'use server'

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function sendOTP(mobileNumber: string) {
    // 1. Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // 2. Save to DB with expiration (5 mins)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
    INSERT OR REPLACE INTO otp_codes (mobile_number, code, expires_at)
    VALUES (?, ?, ?)
  `);
    stmt.run(mobileNumber, code, expiresAt);

    // 3. Send SMS
    try {
        // Fetch SMS settings from DB
        const settingsStmt = db.prepare("SELECT key, value FROM settings WHERE key IN ('sms_api_key', 'sms_sender_name')");
        const settings = settingsStmt.all() as { key: string; value: string }[];
        const settingsMap = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);

        const apiKey = settingsMap['sms_api_key'] || 'Cg4W16D1N9ckkBXhUafP0gS19XB6ZujmMNC5rtkt1e2e6f1c';
        const senderName = settingsMap['sms_sender_name'] || 'School1';

        const message = `رمز التحقق: ${code}`;

        // Format number: remove leading 0, prefix with 966
        // 0501234567 -> 966501234567
        let number = mobileNumber.trim();
        if (number.startsWith('0')) {
            number = '966' + number.substring(1);
        } else if (number.startsWith('5')) {
            number = '966' + number;
        }

        console.log(`[SMS] Sending to ${number}...`);

        const response = await fetch('https://app.mobile.net.sa/api/v1/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                number: number,
                senderName: senderName, // Using default/example sender name to ensure delivery
                sendAtOption: "Now",
                messageBody: message,
                allow_duplicate: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SMS API Error:', errorText);
            // Try to parse JSON error if possible
            try {
                const jsonError = JSON.parse(errorText);
                return { success: false, error: `فشل المزود: ${jsonError.message || JSON.stringify(jsonError)}` };
            } catch {
                return { success: false, error: `فشل المزود: ${errorText.substring(0, 100)}` };
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error('Failed to send SMS:', error);
        return { success: false, error: `فشل إرسال الرسالة: ${error.message}` };
    }
}

export async function verifyOTP(mobileNumber: string, code: string) {
    const stmt = db.prepare('SELECT code, expires_at FROM otp_codes WHERE mobile_number = ?');
    const result = stmt.get(mobileNumber) as { code: string; expires_at: string };

    if (!result) return { success: false, error: 'رقم الجوال غير معروف' };

    if (result.code !== code) return { success: false, error: 'رمز التحقق غير صحيح' };

    if (new Date(result.expires_at) < new Date()) {
        return { success: false, error: 'انتهت صلاحية الرمز' };
    }

    // Clear OTP after success
    db.prepare('DELETE FROM otp_codes WHERE mobile_number = ?').run(mobileNumber);

    return { success: true };
}

export interface VisitorData {
    name: string;
    idNumber: string;
    mobileNumber: string;
    purpose: string;
    signature: string; // Base64
}

export async function submitVisitor(data: VisitorData) {
    const stmt = db.prepare(`
    INSERT INTO visitors (name, id_number, mobile_number, visit_date, visit_time, purpose, signature)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toLocaleTimeString('en-US', { hour12: false });

    try {
        const result = stmt.run(
            data.name,
            data.idNumber,
            data.mobileNumber,
            date,
            time,
            data.purpose,
            data.signature
        );

        revalidatePath('/');
        return { success: true, id: result.lastInsertRowid };
    } catch (error) {
        console.error('Failed to save visitor:', error);
        return { success: false, error: 'Failed to save data' };
    }
}

export async function getVisitors(date?: string) {
    // If no date provided, default to today's date
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
        const stmt = db.prepare('SELECT * FROM visitors WHERE visit_date = ? ORDER BY id DESC');
        const visitors = stmt.all(targetDate) as any[]; // Type as needed
        return { success: true, data: visitors };
    } catch (error) {
        console.error('Failed to get visitors:', error);
        return { success: false, error: 'Failed to fetch data' };
    }
}

export async function getSchoolInfo() {
    try {
        const keys = ['school_country', 'school_ministry', 'school_directorate', 'school_name', 'sms_api_key', 'sms_sender_name', 'enable_otp'];
        const placeholders = keys.map(() => '?').join(',');
        const stmt = db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`);
        const results = stmt.all(...keys) as { key: string; value: string }[];

        const info: Record<string, string> = {};
        results.forEach(r => {
            info[r.key] = r.value;
        });

        return { success: true, data: info };
    } catch (error) {
        console.error('Failed to get school info:', error);
        return { success: false, error: 'Failed to fetch info' };
    }
}

// Existing import modification
import * as XLSX from 'xlsx';

// ... (keep existing functions, I will just append new ones for now, but better to do it cleanly)

export async function importStudents(formData: FormData) {
    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'No file uploaded' };

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Expected columns: Name, Grade, Class, ID Number, Mobile
        // Assuming header row exists, start from index 1. If not, check data.
        // Let's assume row 0 is header.

        const stmt = db.prepare(`
            INSERT INTO students (name, grade, class_name, id_number, mobile_number)
            VALUES (?, ?, ?, ?, ?)
        `);

        // Use transaction for bulk insert
        const insertMany = db.transaction((rows) => {
            for (const row of rows) {
                // row is array [Name, Grade, Class, ID, Mobile]
                // Be careful with index if header exists
                if (!row[0] || !row[3]) continue; // Skip empty rows or missing mandatory fields
                try {
                    stmt.run(row[0], row[1], row[2], String(row[3]), String(row[4]));
                } catch (e) {
                    console.log('Skipping duplicate or invalid row:', row);
                }
            }
        });

        // Skip first row (headers)
        const dataRows = jsonData.slice(1);
        insertMany(dataRows);

        return { success: true, count: dataRows.length };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Failed to process file' };
    }
}

// ... (existing code)

export async function getAllStudents() {
    try {
        const stmt = db.prepare('SELECT * FROM students ORDER BY grade, class_name, name');
        const students = stmt.all();
        return { success: true, data: students };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Failed to fetch students' };
    }
}

export async function searchStudents(filters: { name?: string, grade?: string, class_name?: string, id_number?: string, mobile_number?: string }) {
    try {
        let sql = 'SELECT * FROM students WHERE 1=1';
        const params: any[] = [];

        if (filters.name?.trim()) {
            sql += ' AND name LIKE ?';
            params.push(`%${filters.name.trim()}%`);
        }
        if (filters.grade?.trim()) {
            sql += ' AND grade LIKE ?';
            params.push(`%${filters.grade.trim()}%`);
        }
        if (filters.class_name?.trim()) {
            sql += ' AND class_name LIKE ?';
            params.push(`%${filters.class_name.trim()}%`);
        }
        if (filters.id_number?.trim()) {
            sql += ' AND id_number LIKE ?';
            params.push(`%${filters.id_number.trim()}%`);
        }
        if (filters.mobile_number?.trim()) {
            sql += ' AND mobile_number LIKE ?';
            params.push(`%${filters.mobile_number.trim()}%`);
        }

        sql += ' LIMIT 20';

        const stmt = db.prepare(sql);
        const students = stmt.all(...params);
        return { success: true, data: students };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Search failed' };
    }
}

export async function createExitPermit(studentId: number, reason: string, authorizer: string) {
    try {
        const stmt = db.prepare(`
            INSERT INTO student_exits (student_id, reason, authorizer)
            VALUES (?, ?, ?)
        `);
        stmt.run(studentId, reason, authorizer);
        revalidatePath('/admin/exit-permit');
        revalidatePath('/guard');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to create permit' };
    }
}

export async function getExitPermits(status = 'PENDING') {
    try {
        const stmt = db.prepare(`
            SELECT e.*, s.name as student_name, s.grade, s.class_name 
            FROM student_exits e
            JOIN students s ON e.student_id = s.id
            WHERE e.status = ?
            ORDER BY e.request_time DESC
        `);
        const permits = stmt.all(status);
        return { success: true, data: permits };
    } catch (e) {
        return { success: false, error: 'Fetch failed' };
    }
}

export async function confirmExitPermit(id: number) {
    try {
        const stmt = db.prepare(`
            UPDATE student_exits 
            SET status = 'EXITED', exit_time = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        const info = stmt.run(id);
        console.log('Confirm Permit ID:', id, 'Changes:', info.changes);
        if (info.changes === 0) return { success: false, error: 'Permit not found' };
        revalidatePath('/guard');
        revalidatePath('/admin/exit-permit');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Update failed' };
    }
}

export async function getStudentExitReport(date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    try {
        // Get exits for the day
        const stmt = db.prepare(`
            SELECT e.*, s.name, s.grade, s.class_name, s.id_number
            FROM student_exits e
            JOIN students s ON e.student_id = s.id
            WHERE date(e.exit_time) = ? AND e.status = 'EXITED'
            ORDER BY e.exit_time DESC
        `);

        const exits = stmt.all(targetDate) as any[];

        // Calculate cumulative count for each student in the list
        // Could be optimized, but simpler to query individually or group by

        const exitsWithCount = await Promise.all(exits.map(async (exit) => {
            const countStmt = db.prepare(`
                SELECT COUNT(*) as count FROM student_exits 
                WHERE student_id = ? AND status = 'EXITED'
            `);
            const countRes = countStmt.get(exit.student_id) as { count: number };
            return { ...exit, cumulative_count: countRes.count };
        }));

        return { success: true, data: exitsWithCount };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Report failed' };
    }
}

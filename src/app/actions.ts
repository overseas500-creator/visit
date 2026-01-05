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

        // Developer Log to allow testing without SMS
        console.log(`\n================================`);
        console.log(`[DEV MODE] OTP Code for ${mobileNumber}: ${code}`);
        console.log(`================================\n`);

        // Format number: remove leading 0, prefix with 966
        // 0501234567 -> 966501234567
        let number = mobileNumber.trim();
        if (number.startsWith('0')) {
            number = '966' + number.substring(1);
        } else if (number.startsWith('5')) {
            number = '966' + number;
        }

        console.log(`[SMS] Sending to ${number} via ${senderName}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

        const response = await fetch('https://app.mobile.net.sa/api/v1/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                number: number,
                senderName: senderName.trim(),
                sendAtOption: "Now",
                messageBody: message
            }),
            signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SMS API Error:', response.status, errorText);
            // Try to parse JSON error if possible
            try {
                const jsonError = JSON.parse(errorText);
                return { success: false, error: `خطأ من مزود الخدمة (${response.status}): ${jsonError.message || JSON.stringify(jsonError)}` };
            } catch {
                return { success: false, error: `خطأ من مزود الخدمة (${response.status}): ${errorText.substring(0, 100)}` };
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

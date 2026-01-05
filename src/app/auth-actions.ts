'use server';

import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { redirect } from 'next/navigation';

const JWT_SECRET = new TextEncoder().encode('your-secret-key-change-it-in-prod');

export async function login(password: string) {
    const stmt = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'");
    const result = stmt.get() as { value: string };

    if (result && result.value === password) {
        // Create JWT
        const token = await new SignJWT({ role: 'admin' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(JWT_SECRET);

        (await cookies()).set('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 1 day
        });

        return { success: true };
    }

    return { success: false, error: 'كلمة المرور غير صحيحة' };
}

export async function logout() {
    (await cookies()).delete('admin_token');
    redirect('/login');
}

export async function changePassword(currentPassword: string, newPassword: string) {
    // Verify current password
    const stmt = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'");
    const result = stmt.get() as { value: string };

    if (!result || result.value !== currentPassword) {
        return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
    }

    // Update password
    const updateStmt = db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'");
    updateStmt.run(newPassword);

    return { success: true };
}

export async function verifySession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token');

    if (!token) return false;

    try {
        await jwtVerify(token.value, JWT_SECRET);
        return true;
    } catch (err) {
        return false;
    }
}

export async function updateSchoolInfo(info: Record<string, string>) {
    // Check auth first
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token');
    if (!token) return { success: false, error: 'غير مصرح' };

    try {
        const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        const transaction = db.transaction((data) => {
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'string') { // Type guard
                    stmt.run(key, value);
                }
            }
        });

        transaction(info);
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'حذث خطأ في التحديث' };
    }
}

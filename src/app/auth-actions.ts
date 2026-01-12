'use server';

import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { redirect } from 'next/navigation';

const JWT_SECRET = new TextEncoder().encode('your-secret-key-change-it-in-prod');

export async function login(password: string) {
    console.log('[Login Debug] Attempting login...');
    const db = await getDb();
    const result = await db.get("SELECT value FROM settings WHERE key = 'admin_password'") as { value: string };

    console.log('[Login Debug] DB Password exists:', !!result);
    // console.log('[Login Debug] Password match:', result?.value === password); // Hidden for security in logs

    if (result && result.value === password) {
        console.log('[Login Debug] Password correct. Generating token...');
        // Create JWT
        const token = await new SignJWT({ role: 'admin' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(JWT_SECRET);

        console.log('[Login Debug] Setting cookie...');
        (await cookies()).set('admin_token', token, {
            httpOnly: true,
            secure: true, // Always secure on HTTPS
            sameSite: 'lax', // Relaxed from 'strict' to avoid redirection issues
            maxAge: 60 * 60 * 24, // 1 day
        });

        return { success: true };
    }

    console.log('[Login Debug] Password incorrect');
    return { success: false, error: 'كلمة المرور غير صحيحة' };
}

export async function logout() {
    (await cookies()).delete('admin_token');
    redirect('/login');
}

export async function changePassword(currentPassword: string, newPassword: string) {
    const db = await getDb();
    // Verify current password
    const result = await db.get("SELECT value FROM settings WHERE key = 'admin_password'") as { value: string };

    if (!result || result.value !== currentPassword) {
        return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
    }

    // Update password
    await db.run("UPDATE settings SET value = ? WHERE key = 'admin_password'", newPassword);

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
        const db = await getDb();
        // Manual transaction
        await db.run('BEGIN TRANSACTION');
        try {
            for (const [key, value] of Object.entries(info)) {
                if (typeof value === 'string') { // Type guard
                    // Use INSERT OR REPLACE manually
                    const existing = await db.get("SELECT key FROM settings WHERE key = ?", key);
                    if (existing) {
                        await db.run("UPDATE settings SET value = ? WHERE key = ?", value, key);
                    } else {
                        await db.run("INSERT INTO settings (key, value) VALUES (?, ?)", key, value);
                    }
                }
            }
            await db.run('COMMIT');
        } catch (err) {
            await db.run('ROLLBACK');
            throw err;
        }

        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'حذث خطأ في التحديث' };
    }
}

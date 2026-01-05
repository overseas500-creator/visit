'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/app/auth-actions';
import styles from './login.module.css';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await login(password);
        if (res.success) {
            router.push('/reports');
        } else {
            setError(res.error || 'خطأ في تسجيل الدخول');
        }
    };

    return (
        <div className={styles.container} dir="rtl">
            <div className={styles.card}>
                <h1 className={styles.title}>تسجيل الدخول للمسؤول</h1>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <input
                        type="password"
                        placeholder="كلمة المرور"
                        className={styles.input}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <button type="submit" className={styles.button}>دخول</button>
                </form>
            </div>
        </div>
    );
}

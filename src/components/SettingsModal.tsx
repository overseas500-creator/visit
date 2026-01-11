'use client';

import { useState, useEffect } from 'react';
import { changePassword, logout, updateSchoolInfo } from '@/app/auth-actions';
import { getSchoolInfo } from '@/app/actions';
import styles from './Settings.module.css';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'password' | 'school' | 'sms'>('school');

    // Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // School Info state
    const [schoolInfo, setSchoolInfo] = useState({
        school_country: '',
        school_ministry: '',
        school_directorate: '',
        school_name: ''
    });

    // SMS Settings state
    const [smsSettings, setSmsSettings] = useState({
        sms_api_key: '',
        sms_sender_name: '',
        enable_otp: 'true' // Default to true, stored as string
    });

    const [message, setMessage] = useState('');

    useEffect(() => {
        // Load school info and SMS settings
        getSchoolInfo().then(res => {
            if (res.success && res.data) {
                setSchoolInfo({
                    school_country: res.data.school_country || '',
                    school_ministry: res.data.school_ministry || '',
                    school_directorate: res.data.school_directorate || '',
                    school_name: res.data.school_name || ''
                });
                setSmsSettings({
                    sms_api_key: res.data.sms_api_key || '',
                    sms_sender_name: res.data.sms_sender_name || '',
                    enable_otp: res.data.enable_otp ?? 'true'
                });
            }
        });
    }, []);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await changePassword(currentPassword, newPassword);
        if (res.success) {
            setMessage('تم تغيير كلمة المرور بنجاح');
            setCurrentPassword('');
            setNewPassword('');
        } else {
            setMessage(res.error || 'حدث خطأ');
        }
    };

    const handleUpdateSchoolInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await updateSchoolInfo(schoolInfo);
        if (res.success) {
            setMessage('تم حفظ المعلومات بنجاح');
        } else {
            setMessage(res.error || 'حدث خطأ في الحفظ');
        }
    };

    const handleUpdateSmsSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await updateSchoolInfo(smsSettings); // Reuse the same update function as it works for any settings key
        if (res.success) {
            setMessage('تم حفظ إعدادات الرسائل بنجاح');
        } else {
            setMessage(res.error || 'حدث خطأ في الحفظ');
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className={styles.overlay} dir="rtl">
            <div className={styles.modal}>
                <button onClick={onClose} className={styles.closeBtn}>✕</button>
                <h2 style={{ marginBottom: '1rem' }}>الإعدادات</h2>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'school' ? styles.activeTab : ''}`}
                        onClick={() => { setActiveTab('school'); setMessage(''); }}
                    >
                        بيانات المدرسة
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'sms' ? styles.activeTab : ''}`}
                        onClick={() => { setActiveTab('sms'); setMessage(''); }}
                    >
                        إعدادات الرسائل
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'password' ? styles.activeTab : ''}`}
                        onClick={() => { setActiveTab('password'); setMessage(''); }}
                    >
                        كلمة المرور
                    </button>
                </div>

                {activeTab === 'password' ? (
                    <form onSubmit={handleChangePassword} className={styles.form}>
                        <input
                            type="password"
                            placeholder="كلمة المرور الحالية"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={styles.input}
                        />
                        <input
                            type="password"
                            placeholder="كلمة المرور الجديدة"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={styles.input}
                        />
                        <button type="submit" className={styles.updateBtn}>تحديث كلمة المرور</button>
                    </form>
                ) : activeTab === 'sms' ? (
                    <form onSubmit={handleUpdateSmsSettings} className={styles.form}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="enableOtp"
                                checked={smsSettings.enable_otp === 'true'}
                                onChange={(e) => setSmsSettings({ ...smsSettings, enable_otp: e.target.checked ? 'true' : 'false' })}
                                style={{ width: 'auto' }}
                            />
                            <label htmlFor="enableOtp" style={{ fontWeight: 'bold' }}>تفعيل التحقق برسالة نصية (OTP)</label>
                        </div>

                        <label style={{ fontWeight: 'bold' }}>مفتاح API</label>
                        <input
                            type="text"
                            placeholder="API Key"
                            value={smsSettings.sms_api_key}
                            onChange={(e) => setSmsSettings({ ...smsSettings, sms_api_key: e.target.value })}
                            className={styles.input}
                        />
                        <label style={{ fontWeight: 'bold' }}>اسم المرسل (Sender Name)</label>
                        <input
                            type="text"
                            placeholder="الاسم المسجل (مثل: School1)"
                            value={smsSettings.sms_sender_name}
                            onChange={(e) => setSmsSettings({ ...smsSettings, sms_sender_name: e.target.value })}
                            className={styles.input}
                        />
                        <button type="submit" className={styles.updateBtn}>حفظ الإعدادات</button>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ملاحظة: اسم المرسل يجب أن يكون مفعلاً ومعتمداً من مزود الخدمة.
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleUpdateSchoolInfo} className={styles.form}>
                        <input
                            type="text"
                            placeholder="الدولة (المملكة العربية السعودية)"
                            value={schoolInfo.school_country}
                            onChange={(e) => setSchoolInfo({ ...schoolInfo, school_country: e.target.value })}
                            className={styles.input}
                        />
                        <input
                            type="text"
                            placeholder="الوزارة (وزارة التعليم)"
                            value={schoolInfo.school_ministry}
                            onChange={(e) => setSchoolInfo({ ...schoolInfo, school_ministry: e.target.value })}
                            className={styles.input}
                        />
                        <input
                            type="text"
                            placeholder="الإدارة (الإدارة العامة...)"
                            value={schoolInfo.school_directorate}
                            onChange={(e) => setSchoolInfo({ ...schoolInfo, school_directorate: e.target.value })}
                            className={styles.input}
                        />
                        <input
                            type="text"
                            placeholder="اسم المدرسة"
                            value={schoolInfo.school_name}
                            onChange={(e) => setSchoolInfo({ ...schoolInfo, school_name: e.target.value })}
                            className={styles.input}
                        />
                        <button type="submit" className={styles.updateBtn}>حفظ المعلومات</button>
                    </form>
                )}

                {message && <p className={styles.msg}>{message}</p>}

                <hr className={styles.divider} />

                <button onClick={handleLogout} className={styles.logoutBtn}>تسجيل الخروج</button>
            </div>
        </div>
    );
}

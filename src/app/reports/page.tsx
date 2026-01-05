'use client';

import { useState, useEffect } from 'react';
import { getVisitors, getSchoolInfo } from '@/app/actions';
import styles from './report.module.css';
import Link from 'next/link';
import SettingsModal from '@/components/SettingsModal';
import Image from 'next/image';

export default function ReportsPage() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [visitors, setVisitors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [schoolInfo, setSchoolInfo] = useState<Record<string, string> | null>(null);

    useEffect(() => {
        // Fetch School Info
        getSchoolInfo().then(res => {
            if (res.success && res.data) {
                setSchoolInfo(res.data);
            }
        });
    }, []);

    useEffect(() => {
        fetchVisitors(date);
    }, [date]);

    const fetchVisitors = async (selectedDate: string) => {
        setLoading(true);
        const res = await getVisitors(selectedDate);
        if (res.success) {
            setVisitors(res.data || []);
        }
        setLoading(false);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className={styles.container} dir="rtl">
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

            <div className={styles.topHeader}>
                {schoolInfo && (
                    <div className={styles.schoolInfo}>
                        <p>{schoolInfo.school_country}</p>
                        <p>{schoolInfo.school_ministry}</p>
                        <p>{schoolInfo.school_directorate}</p>
                        <p>{schoolInfo.school_name}</p>
                    </div>
                )}
                <div className={styles.reportTitle}>
                    <h1 className={styles.title}>تقرير الزوار اليومي</h1>
                    <p>{new Date(date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className={styles.logoContainer}>
                    <Image src="/logo_green.png" alt="Logo" width={100} height={100} className={styles.headerLogo} priority />
                </div>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.controls}>
                    <Link href="/" className={styles.homeBtn}>الرئيسية</Link>
                    <button onClick={() => setShowSettings(true)} className={styles.homeBtn}>الإعدادات</button>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={styles.dateInput}
                    />
                    <button onClick={handlePrint} className={styles.printBtn}>
                        طباعة التقرير
                    </button>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                {loading ? (
                    <p>جاري التحميل...</p>
                ) : visitors.length === 0 ? (
                    <p>لا يوجد زوار في هذا التاريخ.</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>الوقت</th>
                                <th>الاسم</th>
                                <th>رقم الهوية</th>
                                <th>الجوال</th>
                                <th>الغرض</th>
                                <th>التوقيع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visitors.map((visitor) => (
                                <tr key={visitor.id}>
                                    <td>{visitor.visit_time}</td>
                                    <td>{visitor.name}</td>
                                    <td>{visitor.id_number}</td>
                                    <td>{visitor.mobile_number}</td>
                                    <td>{visitor.purpose}</td>
                                    <td>
                                        {visitor.signature && (
                                            <img
                                                src={visitor.signature}
                                                alt="توقيع"
                                                className={styles.signatureImg}
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

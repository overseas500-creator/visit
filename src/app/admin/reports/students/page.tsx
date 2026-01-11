'use client';

import { useState, useEffect } from 'react';
import { getStudentExitReport } from '@/app/actions';

export default function StudentExitReportPage() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState<any[]>([]);

    useEffect(() => {
        getStudentExitReport(date).then(res => {
            if (res.success) {
                setReportData(res.data || []);
            }
        });
    }, [date]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ padding: '0.5rem' }}
                />
                <button onClick={handlePrint} style={{ padding: '0.5rem 1rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}>
                    طباعة التقرير
                </button>
            </div>

            <div id="print-area">
                <header style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #333', paddingBottom: '1rem' }}>
                    <h1>تقرير خروج الطلاب اليومي</h1>
                    <p>التاريخ: {date}</p>
                </header>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                    <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem' }}>م</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem' }}>اسم الطالب</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem' }}>الصف</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem' }}>الفصل</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem' }}>وقت الخروج</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem' }}>السبب</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem' }}>المسؤول</th>
                            <th style={{ border: '1px solid #ddd', padding: '0.75rem' }}>عدد مرات الخروج (تراكمي)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((row, index) => (
                            <tr key={row.id}>
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center' }}>{index + 1}</td>
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem' }}>{row.name}</td>
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center' }}>{row.grade}</td>
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center' }}>{row.class_name}</td>
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center' }}>
                                    {new Date(row.exit_time).toLocaleTimeString('ar-SA')}
                                </td>
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem' }}>{row.reason}</td>
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem' }}>{row.authorizer}</td>
                                <td style={{ border: '1px solid #ddd', padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>{row.cumulative_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {reportData.length === 0 && (
                    <p style={{ textAlign: 'center', marginTop: '2rem', color: '#666' }}>لا توجد بيانات لهذا التاريخ</p>
                )}
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { font-size: 12pt; }
                    @page { margin: 1cm; }
                }
            `}</style>
        </div>
    );
}

'use client';

import { searchStudents, createExitPermit, importStudents, getAllStudents, getStudentExitReport } from '@/app/actions';
import { useState, useMemo, useEffect } from 'react';

export default function StudentExitPermitPage() {
    // Tabs state
    const [activeTab, setActiveTab] = useState<'permit' | 'import' | 'report'>('permit');

    // --- Report Logic ---
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === 'report') {
            getStudentExitReport(reportDate).then(res => {
                if (res.success) setReportData(res.data || []);
            });
        }
    }, [reportDate, activeTab]);

    const handlePrintReport = () => {
        window.print();
    };

    // --- Permit Logic ---
    const [filters, setFilters] = useState({
        name: '',
        grade: '',
        class_name: '',
        id_number: '',
        mobile_number: ''
    });
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [reason, setReason] = useState('');
    const [authorizer, setAuthorizer] = useState('');
    const [permitLoading, setPermitLoading] = useState(false);
    const [permitMessage, setPermitMessage] = useState('');

    const [allStudents, setAllStudents] = useState<any[]>([]);

    // Fetch all students on mount for dropdowns
    useEffect(() => {
        getAllStudents().then(res => {
            if (res.success) setAllStudents(res.data || []);
        });
    }, [activeTab]); // Refresh when switching tabs (e.g. after import)

    // Derived Options based on current filters (Cascading)
    const availableStudents = useMemo(() => {
        return allStudents.filter((s: any) => {
            if (filters.grade && s.grade !== filters.grade) return false;
            if (filters.class_name && s.class_name !== filters.class_name) return false;
            if (filters.name && s.name !== filters.name) return false;
            if (filters.id_number && s.id_number !== filters.id_number) return false;
            if (filters.mobile_number && s.mobile_number !== filters.mobile_number) return false;
            return true;
        });
    }, [allStudents, filters]);

    // Options for each dropdown (dependent on previous selections potentially, or just "what's possible given other filters")
    // Use "narrowing" logic: Options are values present in the currently filtered subset (excluding the field itself to avoid lock-in? No, standard cascading)
    // Actually standard cascading: Grade filters Class. Grade+Class filters Name.

    // 1. Grade Options: All distinct grades
    const gradeOptions = useMemo(() => [...new Set(allStudents.map((s: any) => s.grade).filter(Boolean))] as string[], [allStudents]);

    // 2. Class Options: Distinct classes in selected Grade (or all if no grade)
    const classOptions = useMemo(() => {
        const base = filters.grade ? allStudents.filter((s: any) => s.grade === filters.grade) : allStudents;
        return [...new Set(base.map((s: any) => s.class_name).filter(Boolean))] as string[];
    }, [allStudents, filters.grade]);

    // 3. Name Options: Names in selected Grade/Class
    const nameOptions = useMemo(() => {
        const base = allStudents.filter((s: any) => {
            if (filters.grade && s.grade !== filters.grade) return false;
            if (filters.class_name && s.class_name !== filters.class_name) return false;
            return true;
        });
        return [...new Set(base.map((s: any) => s.name).filter(Boolean))] as string[];
    }, [allStudents, filters.grade, filters.class_name]);

    // 4. ID Options: IDs in selected Grade/Class/Name
    const idOptions = useMemo(() => {
        const base = allStudents.filter((s: any) => {
            if (filters.grade && s.grade !== filters.grade) return false;
            if (filters.class_name && s.class_name !== filters.class_name) return false;
            if (filters.name && s.name !== filters.name) return false;
            return true;
        });
        return [...new Set(base.map((s: any) => s.id_number).filter(Boolean))] as string[];
    }, [allStudents, filters.grade, filters.class_name, filters.name]);

    // 5. Mobile Options: Mobiles in selected ...
    const mobileOptions = useMemo(() => {
        const base = allStudents.filter((s: any) => {
            if (filters.grade && s.grade !== filters.grade) return false;
            if (filters.class_name && s.class_name !== filters.class_name) return false;
            if (filters.name && s.name !== filters.name) return false;
            if (filters.id_number && s.id_number !== filters.id_number) return false;
            return true;
        });
        return [...new Set(base.map((s: any) => s.mobile_number).filter(Boolean))] as string[];
    }, [allStudents, filters.grade, filters.class_name, filters.name, filters.id_number]);


    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        // Client-side search is enough since we have data, but let's replicate logic or just use availableStudents
        // If we want to strictly follow "Button Click" behavior:
        setStudents(availableStudents);
        setSelectedStudent(null);
    };

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleSelect = (student: any) => {
        setSelectedStudent(student);
        setStudents([]);
        setFilters({
            name: '',
            grade: '',
            class_name: '',
            id_number: '',
            mobile_number: ''
        });
    };

    const handlePermitSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        setPermitLoading(true);
        const res = await createExitPermit(selectedStudent.id, reason, authorizer);
        if (res.success) {
            setPermitMessage('تم إرسال الطلب بنجاح إلى حارس الأمن');
            setSelectedStudent(null);
            setReason('');
            setAuthorizer('');
            setTimeout(() => setPermitMessage(''), 5000);
        } else {
            setPermitMessage('حدث خطأ أثناء إرسال الطلب');
        }
        setPermitLoading(false);
    };

    // --- Import Logic ---
    const [importStatus, setImportStatus] = useState<string>('');
    const [importLoading, setImportLoading] = useState(false);

    const handleImportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setImportLoading(true);
        setImportStatus('');

        const formData = new FormData(e.currentTarget);
        const res = await importStudents(formData);

        if (res.success) {
            setImportStatus(`تم استيراد ${res.count} طالب بنجاح`);
        } else {
            setImportStatus(`حدث خطأ: ${res.error}`);
        }
        setImportLoading(false);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <img src="/logo.png" alt="Logo" style={{ height: '60px' }} />
                <h1 style={{ margin: 0 }}>بوابة آمن المدرسي - توثيق استئذان طالب</h1>
            </div>

            {/* Tabs */}
            <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setActiveTab('permit')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: activeTab === 'permit' ? '#f0f0f0' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'permit' ? '2px solid #0070f3' : '2px solid transparent',
                        fontWeight: activeTab === 'permit' ? 'bold' : 'normal',
                        cursor: 'pointer',
                        fontSize: '1.1rem'
                    }}
                >
                    إصدار إذن خروج
                </button>
                <button
                    onClick={() => setActiveTab('import')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: activeTab === 'import' ? '#f0f0f0' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'import' ? '2px solid #0070f3' : '2px solid transparent',
                        fontWeight: activeTab === 'import' ? 'bold' : 'normal',
                        cursor: 'pointer',
                        fontSize: '1.1rem'
                    }}
                >
                    استيراد الطلاب
                </button>
                <button
                    onClick={() => setActiveTab('report')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: activeTab === 'report' ? '#f0f0f0' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'report' ? '2px solid #0070f3' : '2px solid transparent',
                        fontWeight: activeTab === 'report' ? 'bold' : 'normal',
                        cursor: 'pointer',
                        fontSize: '1.1rem'
                    }}
                >
                    تقارير الخروج
                </button>
            </div>

            {/* Permit Content */}
            {activeTab === 'permit' && (
                <div>
                    <h2>طلب خروج طالب</h2>

                    {permitMessage && (
                        <div style={{ padding: '1rem', background: '#eef', color: '#0070f3', marginBottom: '1rem', borderRadius: '4px' }}>
                            {permitMessage}
                        </div>
                    )}

                    {!selectedStudent ? (
                        <div style={{ marginBottom: '2rem' }}>
                            <h3>البحث عن طالب</h3>
                            <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
                                {/* 1. Grade */}
                                <select
                                    value={filters.grade}
                                    onChange={(e) => handleFilterChange('grade', e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', direction: 'rtl' }}
                                >
                                    <option value="">كل الصفوف</option>
                                    {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>

                                {/* 2. Class */}
                                <select
                                    value={filters.class_name}
                                    onChange={(e) => handleFilterChange('class_name', e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', direction: 'rtl' }}
                                >
                                    <option value="">كل الفصول</option>
                                    {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>

                                {/* 3. Name */}
                                <select
                                    value={filters.name}
                                    onChange={(e) => handleFilterChange('name', e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', direction: 'rtl' }}
                                >
                                    <option value="">كل الطلاب</option>
                                    {nameOptions.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>

                                {/* 4. ID */}
                                <select
                                    value={filters.id_number}
                                    onChange={(e) => handleFilterChange('id_number', e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', direction: 'rtl' }}
                                >
                                    <option value="">رقم الهوية</option>
                                    {idOptions.map(id => <option key={id} value={id}>{id}</option>)}
                                </select>

                                {/* 5. Mobile */}
                                <select
                                    value={filters.mobile_number}
                                    onChange={(e) => handleFilterChange('mobile_number', e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', direction: 'rtl' }}
                                >
                                    <option value="">رقم الجوال</option>
                                    {mobileOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>

                                <button type="submit" style={{ padding: '0.5rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', height: '36px', cursor: 'pointer' }}>
                                    عرض النتائج
                                </button>
                            </form>

                            {students.length > 0 && (
                                <ul style={{ marginTop: '1rem', border: '1px solid #eee', borderRadius: '4px', padding: 0, listStyle: 'none' }}>
                                    {students.map(s => (
                                        <li key={s.id}
                                            onClick={() => handleSelect(s)}
                                            style={{
                                                padding: '1rem',
                                                borderBottom: '1px solid #eee',
                                                cursor: 'pointer',
                                                background: 'white',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f9'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{s.name}</span>
                                                <span style={{ color: '#0070f3', fontWeight: '500' }}>{s.grade} - {s.class_name}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#666' }}>
                                                <span><strong>الهوية:</strong> {s.id_number}</span>
                                                <span><strong>الجوال:</strong> {s.mobile_number}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : (
                        <div style={{ border: '1px solid #ddd', padding: '1.5rem', borderRadius: '8px' }}>
                            <h3>بيانات الطالب</h3>
                            <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div><strong>الاسم:</strong> {selectedStudent.name}</div>
                                <div><strong>الصف:</strong> {selectedStudent.grade}</div>
                                <div><strong>الفصل:</strong> {selectedStudent.class_name}</div>
                                <div><strong>رقم الهوية:</strong> {selectedStudent.id_number}</div>
                            </div>

                            <button
                                onClick={() => setSelectedStudent(null)}
                                style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.9rem' }}
                            >
                                تغيير الطالب
                            </button>

                            <form onSubmit={handlePermitSubmit}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>سبب الاستئذان</label>
                                    <input
                                        required
                                        type="text"
                                        style={{ width: '100%', padding: '0.5rem' }}
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>اسم مسؤول الاستئذان</label>
                                    <input
                                        required
                                        type="text"
                                        style={{ width: '100%', padding: '0.5rem' }}
                                        value={authorizer}
                                        onChange={(e) => setAuthorizer(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={permitLoading}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--primary, #0070f3)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
                                >
                                    {permitLoading ? 'جاري الإرسال...' : 'إرسال الإذن'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {/* Import Content */}
            {activeTab === 'import' && (
                <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    background: '#f9f9f9'
                }}>
                    <h3>استيراد طلاب من Excel</h3>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                        يجب أن يحتوي الملف على الأعمدة التالية بالترتيب:<br />
                        اسم الطالب | الصف | الفصل | رقم الهوية | رقم الجوال
                    </p>

                    <form onSubmit={handleImportSubmit}>
                        <input
                            type="file"
                            name="file"
                            accept=".xlsx, .xls"
                            required
                            style={{ marginBottom: '1rem', display: 'block' }}
                        />

                        <button
                            type="submit"
                            disabled={importLoading}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'var(--primary, #0070f3)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: importLoading ? 'wait' : 'pointer'
                            }}
                        >
                            {importLoading ? 'جاري الاستيراد...' : 'رفع الملف'}
                        </button>
                    </form>

                    {importStatus && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            background: importStatus.includes('خطأ') ? '#fee' : '#eef',
                            color: importStatus.includes('خطأ') ? '#c00' : '#0070f3',
                            borderRadius: '4px'
                        }}>
                            {importStatus}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'report' && (
                <div id="print-area">
                    <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            style={{ padding: '0.5rem' }}
                        />
                        <button onClick={handlePrintReport} style={{ padding: '0.5rem 1rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            طباعة التقرير
                        </button>
                    </div>

                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid #333', paddingBottom: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <img src="/logo.png" alt="Logo" style={{ height: '80px' }} />
                        </div>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>تقرير خروج الطلاب اليومي</h1>
                            <p style={{ margin: '0.5rem 0 0' }}>التاريخ: {reportDate}</p>
                        </div>
                        <div style={{ width: '80px' }}></div>
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

                    <style jsx global>{`
                        @media print {
                            .no-print { display: none !important; }
                            body { font-size: 12pt; background: white; margin: 0; padding: 0; }
                            @page { size: landscape; margin: 0.5cm; }
                            
                            #print-area {
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: 100%;
                                margin: 0;
                                padding: 0;
                                background: white;
                            }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}

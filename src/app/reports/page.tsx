'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getVisitors, getSchoolInfo, searchStudents, createExitPermit, importStudents, getAllStudents, getStudentExitReport } from '@/app/actions';
import SignatureCanvas from 'react-signature-canvas';
import styles from './report.module.css';
import Link from 'next/link';
import SettingsModal from '@/components/SettingsModal';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

type Tab = 'visitors' | 'permit' | 'student_report' | 'import';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('visitors');
    const [schoolInfo, setSchoolInfo] = useState<Record<string, string> | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    // --- Visitor Report State ---
    const [visitorDate, setVisitorDate] = useState(new Date().toISOString().split('T')[0]);
    const [visitors, setVisitors] = useState<any[]>([]);
    const [visitorLoading, setVisitorLoading] = useState(false);

    // --- Student Exit Report State ---
    const [studentReportDate, setStudentReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [studentReportData, setStudentReportData] = useState<any[]>([]);

    // --- Student Permit Logic State ---
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]); // Displayed students
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [permitLoading, setPermitLoading] = useState(false);
    const [permitMessage, setPermitMessage] = useState('');
    const [reason, setReason] = useState('');

    // Canvas Ref
    const sigCanvas = useRef<any>(null);

    const [filters, setFilters] = useState({
        name: '',
        grade: '',
        class_name: '',
        id_number: '',
        mobile_number: ''
    });

    // --- Import Logic State ---
    const [importStatus, setImportStatus] = useState<string>('');
    const [importLoading, setImportLoading] = useState(false);

    // --- Effects ---

    // 1. Fetch School Info
    useEffect(() => {
        getSchoolInfo().then(res => {
            if (res.success && res.data) {
                setSchoolInfo(res.data);
            }
        });
    }, []);

    // 2. Fetch Visitors when tab is 'visitors' or date changes
    useEffect(() => {
        if (activeTab === 'visitors') {
            setVisitorLoading(true);
            getVisitors(visitorDate).then(res => {
                if (res.success) setVisitors(res.data || []);
                setVisitorLoading(false);
            });
        }
    }, [visitorDate, activeTab]);

    // 3. Fetch Student Report when tab is 'student_report' or date changes
    useEffect(() => {
        if (activeTab === 'student_report') {
            getStudentExitReport(studentReportDate).then(res => {
                if (res.success) setStudentReportData(res.data || []);
            });
        }
    }, [studentReportDate, activeTab]);

    // 4. Fetch All Students for Permit Logic (load once)
    useEffect(() => {
        // Load students if we are in permit tab and haven't loaded yet, or just load once
        // To ensure dropdowns are populated
        if (allStudents.length === 0) {
            getAllStudents().then(res => {
                if (res.success) setAllStudents(res.data || []);
            });
        }
    }, []);

    // --- Derived Options for Permit Filters ---
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

    const gradeOptions = useMemo(() => [...new Set(allStudents.map((s: any) => s.grade).filter(Boolean))] as string[], [allStudents]);

    const classOptions = useMemo(() => {
        const base = filters.grade ? allStudents.filter((s: any) => s.grade === filters.grade) : allStudents;
        return [...new Set(base.map((s: any) => s.class_name).filter(Boolean))] as string[];
    }, [allStudents, filters.grade]);

    const nameOptions = useMemo(() => {
        const base = allStudents.filter((s: any) => {
            if (filters.grade && s.grade !== filters.grade) return false;
            if (filters.class_name && s.class_name !== filters.class_name) return false;
            return true;
        });
        return [...new Set(base.map((s: any) => s.name).filter(Boolean))] as string[];
    }, [allStudents, filters.grade, filters.class_name]);

    const idOptions = useMemo(() => {
        const base = allStudents.filter((s: any) => {
            if (filters.grade && s.grade !== filters.grade) return false;
            if (filters.class_name && s.class_name !== filters.class_name) return false;
            if (filters.name && s.name !== filters.name) return false;
            return true;
        });
        return [...new Set(base.map((s: any) => s.id_number).filter(Boolean))] as string[];
    }, [allStudents, filters.grade, filters.class_name, filters.name]);

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


    // --- Handlers ---
    const handlePrint = () => {
        window.print();
    };

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStudents(availableStudents);
        setSelectedStudent(null);
    };

    const handleSelectStudent = (student: any) => {
        setSelectedStudent(student);
        setStudents([]); // Clear list after selection
        // Reset filters for cleanliness? Or keep them?
        // Let's keep filters
    };

    const handlePermitSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        if (sigCanvas.current.isEmpty()) {
            alert('الرجاء توقيع المسؤول');
            return;
        }
        const authorizerSignature = sigCanvas.current.toDataURL();

        setPermitLoading(true);
        const res = await createExitPermit(selectedStudent.id, reason, authorizerSignature);
        if (res.success) {
            setPermitMessage('تم إرسال الطلب بنجاح إلى حارس الأمن');
            setSelectedStudent(null);
            setReason('');
            sigCanvas.current.clear();
            setTimeout(() => setPermitMessage(''), 5000);
        } else {
            setPermitMessage('حدث خطأ أثناء إرسال الطلب');
        }
        setPermitLoading(false);
    };

    const handleImportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setImportLoading(true);
        setImportStatus('');
        const formData = new FormData(e.currentTarget);
        const res = await importStudents(formData);
        if (res.success) {
            setImportStatus(`تم استيراد ${res.count} طالب بنجاح`);
            // Refresh students
            getAllStudents().then(r => { if (r.success) setAllStudents(r.data || []) });
        } else {
            setImportStatus(`حدث خطأ: ${res.error}`);
        }
        setImportLoading(false);
    };

    // --- Dynamic Title Logic ---
    const getPageTitle = () => {
        switch (activeTab) {
            case 'visitors': return 'تقرير الزوار اليومي';
            case 'permit': return 'إصدار إذن خروج طالب';
            case 'student_report': return 'سجل الاستئذان اليومي';
            case 'import': return 'استيراد بيانات الطلاب';
            default: return 'لوحة التحكم';
        }
    };

    const getPageDate = () => {
        switch (activeTab) {
            case 'visitors': return visitorDate;
            case 'student_report': return studentReportDate;
            default: return new Date().toISOString().split('T')[0];
        }
    };

    return (
        <div className={styles.container} dir="rtl">
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

            {/* Header */}
            <header className={styles.topHeader}>
                {schoolInfo && (
                    <div className={styles.schoolInfo}>
                        <p>{schoolInfo.school_country}</p>
                        <p>{schoolInfo.school_ministry}</p>
                        <p>{schoolInfo.school_directorate}</p>
                        <p>{schoolInfo.school_name}</p>
                    </div>
                )}
                <div className={styles.logoContainer}>
                    <Image src="/logo_green.png" alt="Logo" width={110} height={110} className={styles.headerLogo} priority />
                </div>
                <div className={styles.reportTitle}>
                    <h1 className={styles.title}>{getPageTitle()}</h1>
                    {(activeTab === 'visitors' || activeTab === 'student_report') && (
                        <p>{new Date(getPageDate()).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    )}
                </div>
            </header>

            {/* Navigation Tabs (Hidden in Print) */}
            <div className={`no-print ${styles.tabsContainer}`}>
                <button
                    onClick={() => setActiveTab('visitors')}
                    className={`${styles.tabBtn} ${activeTab === 'visitors' ? styles.activeTab : ''}`}
                >
                    سجل الزوار
                </button>
                <div className={styles.separator}></div>
                <button
                    onClick={() => setActiveTab('permit')}
                    className={`${styles.tabBtn} ${activeTab === 'permit' ? styles.activeTab : ''}`}
                >
                    إصدار إذن خروج
                </button>
                <div className={styles.separator}></div>
                <button
                    onClick={() => setActiveTab('student_report')}
                    className={`${styles.tabBtn} ${activeTab === 'student_report' ? styles.activeTab : ''}`}
                >
                    سجل الاستئذان
                </button>
                <div className={styles.separator}></div>
                <button
                    onClick={() => setActiveTab('import')}
                    className={`${styles.tabBtn} ${activeTab === 'import' ? styles.activeTab : ''}`}
                >
                    استيراد الطلاب
                </button>
            </div>

            {/* Actions Toolbar */}
            <div className={`no-print ${styles.toolbar}`}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link href="/" className={`${styles.actionBtn} ${styles.secondaryBtn}`}>
                        الرئيسية
                    </Link>
                    <button onClick={() => setShowSettings(true)} className={`${styles.actionBtn} ${styles.secondaryBtn}`}>
                        الإعدادات
                    </button>
                </div>

                <div className={styles.controls}>
                    {activeTab === 'visitors' && (
                        <input
                            type="date"
                            value={visitorDate}
                            onChange={(e) => setVisitorDate(e.target.value)}
                            className={styles.dateInput}
                        />
                    )}
                    {activeTab === 'student_report' && (
                        <input
                            type="date"
                            value={studentReportDate}
                            onChange={(e) => setStudentReportDate(e.target.value)}
                            className={styles.dateInput}
                        />
                    )}

                    {(activeTab === 'visitors' || activeTab === 'student_report') && (
                        <button onClick={handlePrint} className={`${styles.actionBtn} ${styles.primaryBtn}`}>
                            طباعة التقرير
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className={styles.contentCard}>

                {/* 1. Visitors Tab */}
                {activeTab === 'visitors' && (
                    <div className={styles.tableWrapper}>
                        {visitorLoading ? <div className={styles.cardPadding}><p>جاري التحميل...</p></div> :
                            visitors.length === 0 ? <div className={styles.cardPadding}><p>لا يوجد زوار في هذا التاريخ.</p></div> : (
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>الوقت</th>
                                            <th>الاسم</th>
                                            <th>رقم الهوية</th>
                                            <th>الجوال</th>
                                            <th>الغرض</th>
                                            <th>الإقرار</th>
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
                                                <td><span style={{ color: 'green', fontWeight: 'bold' }}>تم</span></td>
                                                <td>{visitor.signature && <img src={visitor.signature} alt="توقيع" className={styles.signatureImg} />}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        }
                    </div>
                )}

                {/* 2. Permit Tab */}
                {activeTab === 'permit' && (
                    <div className={styles.cardPadding}>
                        {permitMessage && (
                            <div className={`${styles.messageBox} ${permitMessage.includes('خطأ') ? styles.errorMsg : styles.successMsg}`}>
                                {permitMessage}
                            </div>
                        )}

                        {!selectedStudent ? (
                            <div>
                                <h3 className={styles.label} style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>البحث عن طالب</h3>
                                <form onSubmit={handleSearchSubmit} className={styles.filterGrid}>
                                    <div>
                                        <label className={styles.label} style={{ fontSize: '0.85rem' }}>القف الدراسي</label>
                                        <select className={styles.selectInput} value={filters.grade} onChange={(e) => handleFilterChange('grade', e.target.value)}>
                                            <option value="">كل الصفوف</option>
                                            {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={styles.label} style={{ fontSize: '0.85rem' }}>الفصل</label>
                                        <select className={styles.selectInput} value={filters.class_name} onChange={(e) => handleFilterChange('class_name', e.target.value)}>
                                            <option value="">كل الفصول</option>
                                            {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={styles.label} style={{ fontSize: '0.85rem' }}>اسم الطالب</label>
                                        <select className={styles.selectInput} value={filters.name} onChange={(e) => handleFilterChange('name', e.target.value)}>
                                            <option value="">كل الطلاب</option>
                                            {nameOptions.map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={styles.label} style={{ fontSize: '0.85rem' }}>رقم الهوية</label>
                                        <select className={styles.selectInput} value={filters.id_number} onChange={(e) => handleFilterChange('id_number', e.target.value)}>
                                            <option value="">بحث بالهوية</option>
                                            {idOptions.map(id => <option key={id} value={id}>{id}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={styles.label} style={{ fontSize: '0.85rem' }}>رقم الجوال</label>
                                        <select className={styles.selectInput} value={filters.mobile_number} onChange={(e) => handleFilterChange('mobile_number', e.target.value)}>
                                            <option value="">بحث بالجوال</option>
                                            {mobileOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>

                                    <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} style={{ height: '42px', marginTop: 'auto' }}>
                                        بحث
                                    </button>
                                </form>

                                {students.length > 0 && (
                                    <div style={{ marginTop: '2rem' }}>
                                        <h4 className={styles.label} style={{ marginBottom: '1rem' }}>نتائج البحث ({students.length})</h4>
                                        <ul className={styles.studentList}>
                                            {students.map(s => (
                                                <li key={s.id} onClick={() => handleSelectStudent(s)} className={styles.studentItem}>
                                                    <span><b>{s.name}</b></span>
                                                    <span style={{ color: 'var(--text-muted)' }}>{s.grade} - {s.class_name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1.4rem' }}>إصدار إذن خروج</h3>
                                    <button type="button" onClick={() => setSelectedStudent(null)} className={`${styles.actionBtn} ${styles.secondaryBtn}`} style={{ fontSize: '0.9rem' }}>
                                        تغيير الطالب
                                    </button>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem' }}>
                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}><strong>اسم الطالب:</strong> {selectedStudent.name}</p>
                                    <div style={{ display: 'flex', gap: '2rem' }}>
                                        <p style={{ margin: 0, color: 'var(--text-muted)' }}><strong>الصف:</strong> {selectedStudent.grade} - {selectedStudent.class_name}</p>
                                        <p style={{ margin: 0, color: 'var(--text-muted)' }}><strong>رقم الهوية:</strong> {selectedStudent.id_number}</p>
                                    </div>
                                </div>

                                <form onSubmit={handlePermitSubmit}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>سبب الخروج</label>
                                        <input
                                            type="text"
                                            required
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className={styles.inputText}
                                            placeholder="مثال: موعد مستشفى، ظروف عائلية..."
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>توقيع المسؤول (الوكيل/المدير)</label>
                                        <div className={styles.sigPad}>
                                            <SignatureCanvas
                                                ref={sigCanvas}
                                                penColor='black'
                                                canvasProps={{ style: { width: '100%', height: '180px' } }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                            <button type="button" onClick={() => sigCanvas.current.clear()} style={{ color: 'red', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem' }}>
                                                مسح التوقيع
                                            </button>
                                        </div>

                                        <p style={{ color: '#ef4444', marginTop: '1.5rem', fontWeight: 'bold', fontSize: '0.95rem', lineHeight: '1.6', background: '#fee2e2', padding: '1rem', borderRadius: '0.5rem' }}>
                                            ⚠️ يمنع خروج الطالب من المدرسة إلا بحضور ولي الأمر، وذلك حسب لوائح وزارة التعليم.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button type="submit" disabled={permitLoading} className={`${styles.actionBtn} ${styles.primaryBtn}`} style={{ minWidth: '150px', justifyContent: 'center' }}>
                                            {permitLoading ? 'جاري الإرسال...' : 'اعتماد وإرسال الإذن'}
                                        </button>
                                        <button type="button" onClick={() => setSelectedStudent(null)} className={`${styles.actionBtn} ${styles.secondaryBtn}`} style={{ color: '#ef4444', borderColor: '#fee2e2' }}>
                                            إلغاء
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Student Report Tab */}
                {activeTab === 'student_report' && (
                    <div className={styles.tableWrapper}>
                        {studentReportData.length === 0 ? <div className={styles.cardPadding}><p>لا توجد تصاريح خروج في هذا التاريخ.</p></div> : (
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>م</th>
                                        <th>اسم الطالب</th>
                                        <th>الصف</th>
                                        <th>الفصل</th>
                                        <th>وقت الخروج</th>
                                        <th>السبب</th>
                                        <th>المسؤول</th>
                                        <th>العدد (تراكمي)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentReportData.map((row, index) => (
                                        <tr key={row.id}>
                                            <td>{index + 1}</td>
                                            <td>{row.name}</td>
                                            <td>{row.grade}</td>
                                            <td>{row.class_name}</td>
                                            <td>{new Date(row.exit_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>{row.reason}</td>
                                            <td>
                                                {row.authorizer && row.authorizer.startsWith('data:image') ?
                                                    <img src={row.authorizer} alt="Auth" height={40} style={{ objectFit: 'contain' }} />
                                                    : row.authorizer
                                                }
                                            </td>
                                            <td><span style={{ fontWeight: 'bold', background: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{row.cumulative_count}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* 4. Import Tab */}
                {activeTab === 'import' && (
                    <div className={styles.cardPadding}>
                        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>استيراد طلاب من Excel</h3>
                                <p style={{ color: 'var(--text-muted)' }}>يمكنك رفع ملف Excel يحتوي على بيانات الطلاب لتحديث قاعدة البيانات.</p>
                                <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem', fontSize: '0.9rem', textAlign: 'right' }}>
                                    <strong>الأعمدة المطلوبة:</strong>
                                    <ul style={{ listStyle: 'inside', marginTop: '0.5rem' }}>
                                        <li>اسم الطالب</li>
                                        <li>الصف</li>
                                        <li>الفصل</li>
                                        <li>رقم الهوية</li>
                                        <li>رقم الجوال</li>
                                    </ul>
                                </div>
                            </div>

                            <form onSubmit={handleImportSubmit} style={{ border: '2px dashed #cbd5e1', padding: '3rem 2rem', borderRadius: '1rem', background: '#f8fafc' }}>
                                <input type="file" name="file" accept=".xlsx, .xls" required style={{ display: 'block', margin: '0 auto 2rem auto' }} />
                                <button type="submit" disabled={importLoading} className={`${styles.actionBtn} ${styles.primaryBtn}`} style={{ width: '100%', justifyContent: 'center' }}>
                                    {importLoading ? 'جاري الرفع والمعالجة...' : 'رفع الملف وبدء الاستيراد'}
                                </button>
                            </form>

                            {importStatus && (
                                <div className={`${styles.messageBox} ${importStatus.includes('خطأ') ? styles.errorMsg : styles.successMsg}`} style={{ marginTop: '2rem' }}>
                                    {importStatus}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    /* Force layoutreset for full width printing */
                    body { margin: 0; padding: 0; background: white; }
                    @page { size: landscape; margin: 0.5cm; }
                    
                    /* If we want full width table in print */
                    .${styles.container} { max-width: 100% !important; padding: 0 !important; }
                    .${styles.tableWrapper} { width: 100%; border: none; }
                }
            `}</style>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { getExitPermits, confirmExitPermit } from '@/app/actions';

export default function GuardPage() {
    const [permits, setPermits] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchPermits = () => {
        getExitPermits('PENDING').then(res => {
            if (res.success) {
                setPermits(res.data || []);
            }
        });
    };

    useEffect(() => {
        fetchPermits();
        const interval = setInterval(fetchPermits, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const handleConfirm = async (id: number) => {
        // Confirmation removed to ensure click works
        setLoading(true);
        const res = await confirmExitPermit(id);
        if (res.success) {
            fetchPermits(); // Refresh list
        } else {
            alert('حدث خطأ');
        }
        setLoading(false);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <img src="/logo.png" alt="Logo" style={{ height: '60px' }} />
                <h1 style={{ margin: 0 }}>بوابة الأمن - أذونات الخروج</h1>
            </div>

            <div style={{ marginTop: '2rem' }}>
                {permits.length === 0 ? (
                    <p style={{ color: '#666', textAlign: 'center', marginTop: '2rem' }}>لا توجد أذونات خروج معلقة حالياً</p>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {permits.map(permit => (
                            <div key={permit.id} style={{
                                padding: '1.5rem',
                                border: '2px solid #0070f3',
                                borderRadius: '8px',
                                background: 'white',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <h2 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>{permit.student_name}</h2>
                                        <div style={{ color: '#666', fontSize: '1.1rem' }}>
                                            {permit.grade} - {permit.class_name}
                                        </div>
                                    </div>
                                    <div style={{ background: '#eef', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', color: '#0070f3' }}>
                                        {new Date(permit.request_time).toLocaleTimeString('ar-SA')}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
                                    <div style={{ marginBottom: '0.5rem' }}><strong>سبب الخروج:</strong> {permit.reason}</div>
                                    <div>
                                        <strong>المسؤول:</strong>
                                        {permit.authorizer && permit.authorizer.startsWith('data:image') ? (
                                            <img src={permit.authorizer} alt="توقيع المسؤول" style={{ display: 'block', marginTop: '0.5rem', maxHeight: '60px', border: '1px solid #ddd', background: 'white', borderRadius: '4px' }} />
                                        ) : (
                                            <span> {permit.authorizer}</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleConfirm(permit.id)}
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {loading ? 'جاري التأكيد...' : 'تأكيد الخروج (تم الخروج)'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

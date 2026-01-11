'use client';

import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { submitVisitor, sendOTP, verifyOTP, getSchoolInfo } from '@/app/actions';
import styles from './VisitorForm.module.css';

export default function VisitorForm() {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState({
        name: '',
        idNumber: '',
        mobileNumber: '',
        purpose: '',
        signature: '',
    });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otpEnabled, setOtpEnabled] = useState(true);
    const [visitorId, setVisitorId] = useState<number | bigint | null>(null);

    const sigCanvas = useRef<any>(null);

    const steps = [
        { key: 'name', label: 'اسم الزائر', type: 'text', placeholder: 'أدخل الاسم الثلاثي' },
        { key: 'idNumber', label: 'رقم الهوية / الإقامة', type: 'text', placeholder: 'أدخل رقم الهوية' },
        { key: 'mobileNumber', label: 'رقم الجوال', type: 'tel', placeholder: '05xxxxxxxx' },
        { key: 'purpose', label: 'سبب الزيارة', type: 'text', placeholder: 'اجتماع، توصيل، إلخ' },
        { key: 'signature', label: 'التوقيع', type: 'signature' },
    ];

    const currentStep = steps[step];
    const isLastStep = step === steps.length - 1;

    useEffect(() => {
        getSchoolInfo().then(res => {
            if (res.success && res.data && res.data.enable_otp === 'false') {
                setOtpEnabled(false);
            } else {
                setOtpEnabled(true);
            }
        });
    }, []);

    // Web OTP API Effect
    useEffect(() => {
        if (!showOtpInput) return;

        if ('OTPCredential' in window) {
            const ac = new AbortController();

            // @ts-ignore
            navigator.credentials.get({
                otp: { transport: ['sms'] },
                signal: ac.signal
            } as any).then((otp: any) => {
                setOtpCode(otp.code);
                // Auto verify when code is received
                verifyOTP(formData.mobileNumber, otp.code).then(res => {
                    if (res.success) {
                        setIsVerified(true);
                        setShowOtpInput(false);
                        setStep(prev => prev + 1);
                    } else {
                        alert(res.error || 'رمز التحقق خاطئ');
                    }
                });
            }).catch((err: any) => {
                console.log('Web OTP API error/timeout', err);
            });

            return () => {
                ac.abort();
            };
        }
    }, [showOtpInput, formData.mobileNumber]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [currentStep.key]: e.target.value });
    };

    const handleVerify = async () => {
        setLoading(true);
        const res = await verifyOTP(formData.mobileNumber, otpCode);
        setLoading(false);

        if (res.success) {
            setIsVerified(true);
            setShowOtpInput(false);
            setStep(prev => prev + 1);
        } else {
            alert(res.error || 'رمز التحقق خاطئ');
        }
    };

    const handleSubmit = async (finalSignature?: string) => {
        setLoading(true);
        try {
            const dataToSubmit = {
                ...formData,
                signature: finalSignature || formData.signature,
            };

            const res = await submitVisitor(dataToSubmit);
            if (res.success) {
                setVisitorId(res.id as number | bigint);
                setSubmitted(true);
                // Auto-reset removed as per request
            } else {
                alert('حدث خطأ أثناء الحفظ');
            }
        } catch (e) {
            console.error(e);
            alert('حدث خطأ غير متوقع');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        if (currentStep.key === 'mobileNumber') {
            if (!formData.mobileNumber) return;

            if (otpEnabled && !isVerified) {
                if (showOtpInput) {
                    handleVerify();
                    return;
                }
                setLoading(true);
                const res = await sendOTP(formData.mobileNumber);
                setLoading(false);
                if (res.success) {
                    setShowOtpInput(true);
                } else {
                    alert(res.error || 'فشل إرسال الرمز');
                }
                return;
            }
        }

        if (currentStep.type === 'signature') {
            if (sigCanvas.current.isEmpty()) {
                alert('الرجاء التوقيع قبل المتابعة');
                return;
            }
            const signatureData = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
            setFormData(prev => ({ ...prev, signature: signatureData }));
            handleSubmit(signatureData);
        } else {
            if (!formData[currentStep.key as keyof typeof formData]) {
                return;
            }
            setStep(prev => prev + 1);
        }
    };

    const handleClearSignature = () => {
        sigCanvas.current?.clear();
    };

    if (submitted) {
        return (
            <div className={styles.successCard}>
                <div className={styles.checkIcon}>✓</div>
                <h2>تم التسجيل بنجاح</h2>
                <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>أهلاً بك، {formData.name}</p>

                {visitorId && (
                    <div style={{
                        background: 'var(--background)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '2px solid var(--primary)',
                        margin: '1rem 0'
                    }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>رقمك التسلسلي</p>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)', lineHeight: 1 }}>{visitorId.toString()}</p>
                    </div>
                )}

                <p className={styles.blinkingText} style={{
                    fontWeight: 'bold',
                    marginTop: '1rem',
                    padding: '0.5rem',
                    borderTop: '1px solid var(--border)'
                }}>
                    الآن يرجى إبراز شاشة جوالك لحارس الأمن
                </p>

                <button
                    onClick={() => {
                        setSubmitted(false);
                        setStep(0);
                        setFormData({ name: '', idNumber: '', mobileNumber: '', purpose: '', signature: '' });
                        sigCanvas.current?.clear();
                        setVisitorId(null);
                        setIsVerified(false);
                        setOtpCode('');
                        setShowOtpInput(false);
                    }}
                    style={{
                        marginTop: '1.5rem',
                        padding: '0.75rem 1.5rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        width: '100%'
                    }}
                >
                    تسجيل زائر جديد
                </button>
            </div>
        );
    }

    return (
        <div className={styles.card}>
            <div className={styles.progressBar}>
                <div
                    className={styles.progressFill}
                    style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                />
            </div>

            <div className={styles.stepContainer}>
                <h2 className={styles.label}>
                    {showOtpInput ? 'التحقق من رقم الجوال' : currentStep.label}
                </h2>

                {showOtpInput ? (
                    <div className={styles.otpContainer}>
                        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                            تم إرسال رمز تحقق إلى {formData.mobileNumber}
                        </p>
                        <input
                            autoFocus
                            type="text"
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            maxLength={4}
                            className={styles.input}
                            placeholder="أدخل الرمز (4 أرقام)"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNext();
                            }}
                        />
                    </div>
                ) : currentStep.type === 'signature' ? (
                    <div className={styles.signatureContainer}>
                        <p style={{
                            fontSize: '0.85rem',
                            color: '#c62828',
                            marginBottom: '1rem',
                            textAlign: 'center',
                            lineHeight: '1.4',
                            padding: '10px',
                            background: '#ffebee',
                            borderRadius: '8px'
                        }}>
                            أقر بالعلم أن عقوبة الاعتداء على المعلم/المعلمة بأي شكل من أشكال الاعتداء سواءً الاعتداء اللفظي أو الجسدي أو عبر وسائل الإعلام أو التواصل الاجتماعي ؛ يُعاقب المعتدي بغرامة تصل إلى مليون ريال والسجن 10 سنوات كما أقر بالعلم بمنع التصوير أو التسجيل داخل المدرسة
                        </p>
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor="black"
                            canvasProps={{ className: styles.sigCanvas }}
                        />
                        <button type="button" onClick={handleClearSignature} className={styles.clearBtn}>
                            مسح
                        </button>
                    </div>
                ) : (
                    <>
                        <input
                            autoFocus
                            type={currentStep.type}
                            className={styles.input}
                            placeholder={currentStep.placeholder}
                            value={formData[currentStep.key as keyof typeof formData]}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNext();
                            }}
                        />
                        {currentStep.key === 'mobileNumber' && otpEnabled && !showOtpInput && (
                            <button
                                style={{
                                    marginTop: '1rem',
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                                onClick={handleNext}
                                disabled={loading || !formData.mobileNumber}
                            >
                                {loading ? 'جاري الإرسال...' : 'إرسال كود التحقق'}
                            </button>
                        )}
                    </>
                )}
            </div>

            <div className={styles.actions}>
                {step > 0 && !showOtpInput && (
                    <button
                        className={styles.backBtn}
                        onClick={() => setStep(prev => prev - 1)}
                        disabled={loading}
                    >
                        رجوع
                    </button>
                )}

                {showOtpInput && (
                    <button
                        className={styles.backBtn}
                        onClick={() => setShowOtpInput(false)}
                        disabled={loading}
                    >
                        تغيير الرقم
                    </button>
                )}

                {!(currentStep.key === 'mobileNumber' && otpEnabled && !showOtpInput) && (
                    <button
                        className={styles.nextBtn}
                        onClick={handleNext}
                        disabled={loading || (!showOtpInput && currentStep.type !== 'signature' && !formData[currentStep.key as keyof typeof formData])}
                    >
                        {showOtpInput ? (loading ? 'جاري التحقق...' : 'تحقق') :
                            isLastStep ? (loading ? 'جاري الحفظ...' : 'إنهاء') : 'التالي'}
                    </button>
                )}
            </div>
        </div>
    );
}

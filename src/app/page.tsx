import VisitorForm from "@/components/VisitorForm";
import styles from "./page.module.css";
import { getSchoolInfo } from "./actions";
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const schoolInfoRes = await getSchoolInfo();
  const schoolInfo = schoolInfoRes.success ? schoolInfoRes.data : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1>نظام تسجيل الزوار</h1>
            <a href="/reports" style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "underline" }}>عرض التقارير</a>
          </div>

          <div className={styles.logoContainer}>
            <Image src="/logo_green.png" alt="Logo" width={120} height={120} className={styles.headerLogo} priority />
          </div>

          {schoolInfo && (
            <div className={styles.schoolInfo}>
              <p>{schoolInfo.school_country}</p>
              <p>{schoolInfo.school_ministry}</p>
              <p>{schoolInfo.school_directorate}</p>
              <p>{schoolInfo.school_name}</p>
            </div>
          )}
        </div>
      </header>
      <main className={styles.main}>
        <VisitorForm />
      </main>

      <footer className={styles.footer}>
        <p>جميع الحقوق الفكرية والبرمجية محفوظة لـ ماجد عثمان الزهراني</p>
      </footer>
    </div>
  );
}

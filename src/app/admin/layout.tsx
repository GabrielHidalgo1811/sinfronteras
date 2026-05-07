'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Utensils, PackageMinus, BarChart3, LogOut } from 'lucide-react';
import { checkAndCloseDayIfNeeded } from '@/utils/cierreDia';
import styles from './admin.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Auto-detect new day and archive yesterday
      try {
        const result = await checkAndCloseDayIfNeeded();
        if (result.isNewDay) {
          console.log(`🌅 Nuevo día detectado. Datos de ${result.closedDate || 'ayer'} archivados. Platos reseteados.`);
        }
      } catch (e) {
        console.log('Cierre de día: tabla historial_diario puede no existir aún.', e);
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className={styles.loadingScreen}>Verificando acceso...</div>;

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className="title-cursive">Panel Admin</h2>
        </div>
        <nav className={styles.nav}>
          <Link href="/admin" className={`${styles.navItem} ${pathname === '/admin' ? styles.active : ''}`}>
            <Utensils size={20} />
            <span>Menú y Ensaladas</span>
          </Link>
          <Link href="/admin/operaciones" className={`${styles.navItem} ${pathname?.startsWith('/admin/operaciones') ? styles.active : ''}`}>
            <PackageMinus size={20} />
            <span>Módulo Operativo</span>
          </Link>
          <Link href="/admin/estadisticas" className={`${styles.navItem} ${pathname === '/admin/estadisticas' ? styles.active : ''}`}>
            <BarChart3 size={20} />
            <span>Estadísticas</span>
          </Link>
        </nav>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </aside>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}

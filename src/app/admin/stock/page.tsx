'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from '../admin.module.css';

export default function StockAdmin() {
  const [platosActivos, setPlatosActivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatosActivos();
  }, []);

  const fetchPlatosActivos = async () => {
    const { data } = await supabase
      .from('platos')
      .select('*')
      .eq('estado_activo', true)
      .order('nombre', { ascending: true });
      
    if (data) setPlatosActivos(data);
    setLoading(false);
  };

  const handleRestarStock = async (id: string, currentStock: number) => {
    if (currentStock <= 0) return;
    
    const newStock = currentStock - 1;
    
    // Update optimistically
    setPlatosActivos(prev => 
      prev.map(p => p.id === id ? { ...p, cantidad_diaria: newStock } : p)
    );

    const { error } = await supabase
      .from('platos')
      .update({ cantidad_diaria: newStock })
      .eq('id', id);

    if (error) {
      console.error('Error updating stock:', error);
      fetchPlatosActivos(); // Revert on error
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Control Manual de Stock</h1>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Plato</th>
              <th>Stock Actual</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3}>Cargando...</td></tr>
            ) : platosActivos.length === 0 ? (
              <tr><td colSpan={3}>No hay platos activos. Ve a "Gestión de Platos" para activar algunos.</td></tr>
            ) : (
              platosActivos.map((plato) => (
                <tr key={plato.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {plato.imagen_url && <img src={plato.imagen_url} alt={plato.nombre} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                      {plato.nombre}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: plato.cantidad_diaria <= 0 ? 'var(--danger)' : 'inherit' }}>
                      {plato.cantidad_diaria}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-primary"
                      onClick={() => handleRestarStock(plato.id, plato.cantidad_diaria)}
                      disabled={plato.cantidad_diaria <= 0}
                      style={{ fontSize: '1.25rem', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      -
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

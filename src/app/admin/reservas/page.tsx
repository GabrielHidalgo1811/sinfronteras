'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from '../admin.module.css';

export default function ReservasAdmin() {
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservas();
  }, []);

  const fetchReservas = async () => {
    // We need to join with platos to get the dish name and stock
    const { data, error } = await supabase
      .from('reservas')
      .select(`
        *,
        platos ( id, nombre, cantidad_diaria )
      `)
      .eq('estado', 'pendiente')
      .order('hora_retiro', { ascending: true });

    if (error) {
      console.error('Error fetching reservas:', error);
    } else if (data) {
      setReservas(data);
    }
    setLoading(false);
  };

  const handleEstadoReserva = async (reservaId: string, plato: any, nuevoEstado: 'retirado' | 'no_llego') => {
    // 1. Update reserva state
    const { error: errorReserva } = await supabase
      .from('reservas')
      .update({ estado: nuevoEstado })
      .eq('id', reservaId);

    if (errorReserva) {
      alert('Error al actualizar la reserva.');
      return;
    }

    // 2. If 'retirado', decrement stock
    if (nuevoEstado === 'retirado') {
      const newStock = Math.max(0, plato.cantidad_diaria - 1);
      await supabase
        .from('platos')
        .update({ cantidad_diaria: newStock })
        .eq('id', plato.id);
    }

    // Refresh list
    fetchReservas();
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Gestión de Reservas</h1>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Plato</th>
              <th>Hora Retiro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}>Cargando...</td></tr>
            ) : reservas.length === 0 ? (
              <tr><td colSpan={5}>No hay reservas pendientes.</td></tr>
            ) : (
              reservas.map((reserva) => (
                <tr key={reserva.id}>
                  <td>
                    <strong>{reserva.nombre_cliente} {reserva.apellido_cliente}</strong>
                  </td>
                  <td>{reserva.telefono}</td>
                  <td>{reserva.platos?.nombre}</td>
                  <td>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      {reserva.hora_retiro.substring(0, 5)} {/* HH:mm format */}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn-success"
                        onClick={() => handleEstadoReserva(reserva.id, reserva.platos, 'retirado')}
                      >
                        Retirado
                      </button>
                      <button 
                        className="btn-danger"
                        onClick={() => handleEstadoReserva(reserva.id, reserva.platos, 'no_llego')}
                      >
                        No llegó
                      </button>
                    </div>
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

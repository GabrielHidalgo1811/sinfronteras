import React, { useState } from 'react';
import styles from './ReservationModal.module.css';
import { supabase } from '@/lib/supabase';

interface ReservationModalProps {
  dish: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReservationModal({ dish, onClose, onSuccess }: ReservationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    apellido_cliente: '',
    telefono: '',
    hora_retiro: '',
    notas: '',
  });

  const [options, setOptions] = useState({
    incluye_pan: true,
    incluye_bebida: true,
    incluye_consome: true,
    tipo_ensalada: 'Ninguna',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setOptions({ ...options, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: sbError } = await supabase
        .from('pedidos')
        .insert([
          {
            plato_id: dish.id,
            tipo: 'reserva',
            nombre_cliente: formData.nombre_cliente,
            apellido_cliente: formData.apellido_cliente,
            telefono: formData.telefono,
            hora_retiro: formData.hora_retiro,
            incluye_pan: options.incluye_pan,
            incluye_bebida: options.incluye_bebida,
            incluye_consome: options.incluye_consome,
            tipo_ensalada: options.tipo_ensalada,
            notas: formData.notas,
            estado: 'pendiente'
          }
        ]);

      if (sbError) throw sbError;
      
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError('Hubo un error al procesar tu reserva. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        
        <h2 className={styles.title}>Reserva tu colación</h2>
        <div className={styles.dishInfo}>
          {dish.imagen_url && <img src={dish.imagen_url} alt={dish.nombre} className={styles.thumb} />}
          <div>
            <p className={styles.dishName}>{dish.nombre}</p>
            <p className={styles.dishPrice}>${dish.precio.toLocaleString()}</p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          
          <div className={styles.switchesGroup}>
            <label className="switch-label">
              <input type="checkbox" name="incluye_pan" checked={options.incluye_pan} onChange={handleOptionsChange} className="switch-input" />
              <span>🥖 Incluir Pan</span>
            </label>
            <label className="switch-label">
              <input type="checkbox" name="incluye_bebida" checked={options.incluye_bebida} onChange={handleOptionsChange} className="switch-input" />
              <span>🥤 Incluir Bebida</span>
            </label>
            <label className="switch-label">
              <input type="checkbox" name="incluye_consome" checked={options.incluye_consome} onChange={handleOptionsChange} className="switch-input" />
              <span>🥣 Incluir Consomé</span>
            </label>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="tipo_ensalada">🥗 Elige tu ensalada</label>
            <select id="tipo_ensalada" name="tipo_ensalada" value={options.tipo_ensalada} onChange={handleOptionsChange} className="input-field">
              <option value="Ninguna">Sin ensalada</option>
              <option value="Tomate/Cebolla">Tomate y Cebolla</option>
              <option value="Lechuga/Limón">Lechuga con Limón</option>
              <option value="Surtida">Surtida de la casa</option>
            </select>
          </div>

          <hr className={styles.divider} />

          <div className={styles.formGroup}>
            <label htmlFor="nombre_cliente">Nombre</label>
            <input type="text" id="nombre_cliente" name="nombre_cliente" required value={formData.nombre_cliente} onChange={handleChange} className="input-field" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="apellido_cliente">Apellido</label>
            <input type="text" id="apellido_cliente" name="apellido_cliente" required value={formData.apellido_cliente} onChange={handleChange} className="input-field" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="telefono">Teléfono</label>
            <input type="tel" id="telefono" name="telefono" required value={formData.telefono} onChange={handleChange} className="input-field" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="hora_retiro">Hora de retiro aproximada</label>
            <input type="time" id="hora_retiro" name="hora_retiro" required value={formData.hora_retiro} onChange={handleChange} className="input-field" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="notas">Notas adicionales</label>
            <textarea id="notas" name="notas" value={formData.notas} onChange={handleChange} className="input-field" rows={2} placeholder="Ej: Sin sal, cubiertos extra..."></textarea>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Procesando...' : 'Confirmar Reserva'}
          </button>
        </form>
      </div>
    </div>
  );
}

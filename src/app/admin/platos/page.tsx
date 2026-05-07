'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from '../admin.module.css';

export default function PlatosAdmin() {
  const [platos, setPlatos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [imagen, setImagen] = useState<File | null>(null);
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPlatos();
  }, []);

  const fetchPlatos = async () => {
    const { data } = await supabase.from('platos').select('*').order('created_at', { ascending: false });
    if (data) setPlatos(data);
    setLoading(false);
  };

  const handleAddPlato = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let imagen_url = null;

      if (imagen) {
        const fileExt = imagen.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('platos_images')
          .upload(filePath, imagen);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('platos_images')
          .getPublicUrl(filePath);
          
        imagen_url = publicUrl;
      }

      const { error } = await supabase.from('platos').insert([
        {
          nombre,
          precio: parseFloat(precio),
          imagen_url,
          estado_activo: false,
          cantidad_diaria: 0
        }
      ]);

      if (error) throw error;
      
      // Reset form
      setNombre('');
      setPrecio('');
      setImagen(null);
      fetchPlatos();
    } catch (error) {
      console.error('Error adding plato:', error);
      alert('Error al agregar el plato.');
    } finally {
      setUploading(false);
    }
  };

  const toggleEstado = async (id: string, currentState: boolean, currentStock: number) => {
    let newStock = currentStock;
    if (!currentState) {
      const stockInput = prompt('Ingrese la cantidad contemplada para hoy:', '10');
      if (stockInput === null) return; // User cancelled
      newStock = parseInt(stockInput, 10);
      if (isNaN(newStock) || newStock < 0) {
        alert('Cantidad inválida.');
        return;
      }
    }

    const { error } = await supabase
      .from('platos')
      .update({ estado_activo: !currentState, cantidad_diaria: newStock })
      .eq('id', id);

    if (error) {
      console.error('Error updating estado:', error);
      alert('Error al actualizar.');
    } else {
      fetchPlatos();
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Gestión de Platos</h1>
      </div>

      <div className={styles.card} style={{ marginBottom: '2rem' }}>
        <h3>Agregar Nuevo Plato</h3>
        <form onSubmit={handleAddPlato} style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label>Nombre del plato</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required style={{ width: '100%', padding: '0.5rem' }} />
          </div>
          <div style={{ flex: '1 1 100px' }}>
            <label>Precio ($)</label>
            <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} required style={{ width: '100%', padding: '0.5rem' }} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label>Imagen</label>
            <input type="file" accept="image/*" onChange={(e) => setImagen(e.target.files?.[0] || null)} style={{ width: '100%', padding: '0.5rem' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Plato</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Stock Actual</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}>Cargando...</td></tr>
            ) : (
              platos.map((plato) => (
                <tr key={plato.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {plato.imagen_url && <img src={plato.imagen_url} alt={plato.nombre} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                      {plato.nombre}
                    </div>
                  </td>
                  <td>${plato.precio.toLocaleString()}</td>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.875rem',
                      backgroundColor: plato.estado_activo ? '#dcfce7' : '#fee2e2',
                      color: plato.estado_activo ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {plato.estado_activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{plato.estado_activo ? plato.cantidad_diaria : '-'}</td>
                  <td>
                    <button 
                      className={plato.estado_activo ? 'btn-danger' : 'btn-success'}
                      onClick={() => toggleEstado(plato.id, plato.estado_activo, plato.cantidad_diaria)}
                    >
                      {plato.estado_activo ? 'Desactivar' : 'Activar'}
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

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Dish = {
  id: string;
  nombre: string;
  imagen_url: string;
  precio: number;
};

interface BookingModalProps {
  dish: Dish;
  onClose: () => void;
  onSuccess: () => void;
  isPOS?: boolean;
}

export default function BookingModal({ dish, onClose, onSuccess, isPOS = false }: BookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agregados, setAgregados] = useState<any[]>([]);
  const [ensaladas, setEnsaladas] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    nombre_cliente: '',
    telefono: '',
    hora_retiro: '',
    notas: '',
    tipo_entrega: 'Para servir', // default
  });

  const [options, setOptions] = useState({
    incluye_pan: true,
    incluye_jugo: true,
    incluye_consome: true,
    incluye_pebre: true,
    agregado_id: '',
    agregado_2_id: '',
    ensalada_id: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: agData } = await supabase.from('agregados').select('*').eq('estado_activo', true);
      const { data: enData } = await supabase.from('ensaladas').select('*').eq('estado_activo', true);
      if (agData) setAgregados(agData);
      if (enData) setEnsaladas(enData);
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const payload = {
        plato_id: dish.id,
        tipo: isPOS ? 'presencial' : 'reserva',
        nombre_cliente: formData.nombre_cliente,
        telefono: isPOS ? 'POS' : formData.telefono,
        hora_retiro: isPOS ? null : formData.hora_retiro,
        incluye_pan: options.incluye_pan,
        incluye_jugo: options.incluye_jugo,
        incluye_consome: options.incluye_consome,
        incluye_pebre: options.incluye_pebre,
        ensalada_id: options.ensalada_id || null,
        agregado_id: options.agregado_id || null,
        agregado_2_id: options.agregado_2_id || null,
        notas: (formData.tipo_entrega ? `[${formData.tipo_entrega}] ` : '') + (formData.notas || ''),
        estado: 'pendiente'
      };

      const { error: sbError } = await supabase.from('pedidos').insert([payload]);

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white p-8 rounded-[24px] w-full max-w-md relative shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button 
          className="absolute top-4 right-4 text-3xl leading-none text-gray-400 hover:text-pogonia-fg transition-colors"
          onClick={onClose}
        >
          &times;
        </button>
        
        <h2 className="text-3xl font-heading text-pogonia-orange mb-6 text-center tracking-tight">Arma tu plato</h2>
        
        <div className="flex items-center gap-4 mb-6 p-4 bg-pogonia-bg rounded-2xl">
          {dish.imagen_url ? (
            <img src={dish.imagen_url} alt={dish.nombre} className="w-16 h-16 object-cover rounded-xl shadow-sm" />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-sm font-medium text-gray-500">Sin imagen</div>
          )}
          <div>
            <p className="font-heading font-bold text-lg text-pogonia-fg leading-tight">{dish.nombre}</p>
            <p className="text-pogonia-orange font-heading font-bold">${dish.precio.toLocaleString()}</p>
          </div>
        </div>

        {error && <div className="bg-red-100 text-red-600 p-3 rounded-xl mb-6 text-center text-sm font-medium">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="agregado_id" className="block font-heading font-bold text-pogonia-fg mb-2">¿Qué agregado quieres?</label>
              <select 
                id="agregado_id" 
                name="agregado_id" 
                required
                value={options.agregado_id} 
                onChange={handleOptionsChange} 
                className="w-full p-4 border-2 border-gray-200 rounded-2xl outline-none focus:border-pogonia-orange transition-colors font-medium bg-white"
              >
                <option value="">Selecciona una opción...</option>
                {agregados.map(ag => (
                  <option key={ag.id} value={ag.id}>{ag.nombre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="agregado_2_id" className="block font-heading font-bold text-pogonia-fg mb-2">Segundo agregado (Opcional)</label>
              <select 
                id="agregado_2_id" 
                name="agregado_2_id" 
                value={options.agregado_2_id} 
                onChange={handleOptionsChange} 
                className="w-full p-4 border-2 border-gray-200 rounded-2xl outline-none focus:border-pogonia-orange transition-colors font-medium bg-white"
              >
                <option value="">Ninguno</option>
                {agregados.map(ag => (
                  <option key={ag.id} value={ag.id}>{ag.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ensalada_id" className="block font-heading font-bold text-pogonia-fg mb-2">¿Qué ensalada deseas?</label>
              <select 
                id="ensalada_id" 
                name="ensalada_id" 
                value={options.ensalada_id} 
                onChange={handleOptionsChange} 
                className="w-full p-4 border-2 border-gray-200 rounded-2xl outline-none focus:border-pogonia-orange transition-colors font-medium bg-white"
              >
                <option value="">Ninguna</option>
                {ensaladas.map(ens => (
                  <option key={ens.id} value={ens.id}>{ens.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-2xl">
            <p className="font-heading font-bold text-pogonia-fg mb-1">Extras por defecto</p>
            
            {[
              { name: 'incluye_pan', label: '¿Lleva Pan?', checked: options.incluye_pan },
              { name: 'incluye_jugo', label: '¿Lleva Jugo?', checked: options.incluye_jugo },
              { name: 'incluye_consome', label: '¿Lleva Consomé?', checked: options.incluye_consome },
              { name: 'incluye_pebre', label: '¿Lleva Pebre?', checked: options.incluye_pebre },
            ].map(item => (
              <label key={item.name} className="flex items-center justify-between cursor-pointer group">
                <span className="font-semibold text-gray-700">{item.label}</span>
                <div className="relative">
                  <input 
                    type="checkbox" 
                    name={item.name} 
                    checked={item.checked} 
                    onChange={handleOptionsChange} 
                    className="sr-only peer" 
                  />
                  <div className="w-12 h-6 bg-gray-300 rounded-full peer peer-checked:bg-pogonia-orange transition-colors duration-300"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 peer-checked:translate-x-6 shadow-md"></div>
                </div>
              </label>
            ))}
          </div>

          {/* Información adicional / Notas */}
          <div>
            <label htmlFor="notas" className="block font-heading font-bold text-pogonia-fg mb-2">📝 Información adicional</label>
            <textarea 
              id="notas" 
              name="notas" 
              value={formData.notas} 
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="w-full p-4 border-2 border-gray-200 rounded-2xl outline-none focus:border-pogonia-orange transition-colors font-medium bg-white resize-none" 
              rows={2}
              placeholder="Ej: Sin cebolla, alergia al maní, extra picante..."
            />
          </div>

          <hr className="border-t-2 border-dashed border-gray-200" />

          {/* Sección Datos Cliente o Mesa */}
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="nombre_cliente" className="block font-heading font-bold text-pogonia-fg mb-2">
                {isPOS ? 'Número de Mesa' : 'Tu Nombre'}
              </label>
              <input 
                id="nombre_cliente" 
                name="nombre_cliente" 
                required 
                value={formData.nombre_cliente} 
                onChange={handleChange} 
                className="w-full p-4 border-2 border-gray-200 rounded-2xl outline-none focus:border-pogonia-orange transition-colors font-medium bg-white" 
                placeholder={isPOS ? 'Ej: 5' : 'Ej: Juan Pérez'}
              />
            </div>

            {!isPOS && (
              <>
                <div>
                  <label className="block font-heading font-bold text-pogonia-fg mb-2">¿Cómo deseas tu pedido?</label>
                  <div className="flex gap-4">
                    <label className="flex-1 border-2 border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-pogonia-orange transition-colors flex items-center justify-center gap-2">
                      <input type="radio" name="tipo_entrega" value="Para llevar" checked={formData.tipo_entrega === 'Para llevar'} onChange={handleChange} required className="accent-pogonia-orange" />
                      <span className="font-bold text-gray-700">🥡 Para Llevar</span>
                    </label>
                    <label className="flex-1 border-2 border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-pogonia-orange transition-colors flex items-center justify-center gap-2">
                      <input type="radio" name="tipo_entrega" value="Para servir" checked={formData.tipo_entrega === 'Para servir'} onChange={handleChange} required className="accent-pogonia-orange" />
                      <span className="font-bold text-gray-700">🍽️ Para Servir</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="telefono" className="block font-heading font-bold text-pogonia-fg mb-2">Teléfono</label>
                  <input 
                    id="telefono" 
                    name="telefono" 
                    type="tel" 
                    required 
                    value={formData.telefono} 
                    onChange={handleChange} 
                    className="w-full p-4 border-2 border-gray-200 rounded-2xl outline-none focus:border-pogonia-orange transition-colors font-medium bg-white" 
                    placeholder="Ej: +56912345678"
                  />
                </div>
                <div>
                  <label htmlFor="hora_retiro" className="block font-heading font-bold text-pogonia-fg mb-2">Hora de Retiro (12:00 PM - 08:00 PM)</label>
                  <input 
                    id="hora_retiro" 
                    name="hora_retiro" 
                    type="time" 
                    min="12:00"
                    max="20:00"
                    required 
                    value={formData.hora_retiro} 
                    onChange={handleChange} 
                    className="w-full p-4 border-2 border-gray-200 rounded-2xl outline-none focus:border-pogonia-orange transition-colors font-medium bg-white" 
                  />
                </div>
              </>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full mt-4 bg-pogonia-orange text-white font-heading font-bold text-xl py-4 rounded-[24px] hover:bg-orange-600 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(255,95,0,0.4)] active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Preparando...' : (isPOS ? 'Enviar Pedido Presencial' : 'Confirmar Reserva')}
          </button>
        </form>
      </div>
    </div>
  );
}

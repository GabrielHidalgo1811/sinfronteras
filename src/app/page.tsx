'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import MenuCard from '@/components/MenuCard';
import BookingModal from '@/components/BookingModal';

export default function Home() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [platos, setPlatos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDish, setSelectedDish] = useState<any | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchData = async () => {
    // Fetch categorías
    const { data: cats } = await supabase.from('categorias').select('*').order('orden', { ascending: true });
    if (cats) setCategorias(cats);

    // Fetch platos activos
    const { data: dishes } = await supabase
      .from('platos')
      .select('*, categorias(nombre)')
      .eq('estado_activo', true);
    
    if (dishes) setPlatos(dishes);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Suscripción para reflejar cambios de stock instantáneamente
    const channel = supabase.channel('platos_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'platos' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, []);

  const handleReservationSuccess = () => {
    setSelectedDish(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  return (
    <main className="min-h-screen bg-pogonia-bg pb-12">
      <header className="bg-white shadow-sm py-12 mb-12 rounded-b-[40px] text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-heading text-pogonia-fg tracking-tight mb-4">
            Colaciones <span className="text-pogonia-orange">Sin Frontera</span>
          </h1>
          <p className="text-gray-500 font-medium text-lg max-w-lg mx-auto">
            Comida peruana, chilena y venezolana directa a tu mesa.
          </p>
        </div>
      </header>

      <section className="container mx-auto px-4 max-w-5xl">
        {showSuccess && (
          <div className="mb-8 p-6 bg-green-100 text-green-800 rounded-[24px] font-bold text-center text-xl shadow-sm border border-green-200 flex items-center justify-center gap-3">
            <span>✅</span> ¡Reserva confirmada con éxito! Te esperamos.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <p className="text-xl text-gray-400 font-medium animate-pulse">Cargando nuestro menú delicioso...</p>
          </div>
        ) : platos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] shadow-sm">
            <p className="text-2xl text-gray-500 font-heading">No hay platos disponibles por el momento 😢</p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {categorias.map(categoria => {
              const platosCategoria = platos.filter(p => p.categoria_id === categoria.id);
              if (platosCategoria.length === 0) return null;

              return (
                <div key={categoria.id}>
                  <div className="flex items-baseline gap-4 mb-6">
                    <h2 className="text-3xl font-heading text-pogonia-fg">{categoria.nombre}</h2>
                    <span className="text-xl font-heading text-pogonia-orange bg-orange-100 px-3 py-1 rounded-full">${categoria.precio.toLocaleString()}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {platosCategoria.map(plato => (
                      <MenuCard
                        key={plato.id}
                        id={plato.id}
                        nombre={plato.nombre}
                        precio={categoria.precio} // Usa el precio de la categoría
                        imagen_url={plato.imagen_url}
                        cantidad_diaria={plato.cantidad_diaria}
                        categoriaNombre={categoria.nombre}
                        onReservar={setSelectedDish}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedDish && (
        <BookingModal
          dish={selectedDish}
          onClose={() => setSelectedDish(null)}
          onSuccess={handleReservationSuccess}
        />
      )}

      {/* Footer Minimalista */}
      <footer className="text-center py-8 text-gray-500 font-medium mt-12 border-t border-gray-100">
        <p>© {new Date().getFullYear()} Colaciones Sin Frontera. Todos los derechos reservados.</p>
        <div className="mt-4">
          <a href="/login" className="text-sm font-bold hover:text-pogonia-orange transition-colors">
            Acceso Admin
          </a>
        </div>
      </footer>

      {/* Botón flotante WhatsApp */}
      <a
        href="https://wa.me/56942531987?text=Hola%2C%20quiero%20hacer%20un%20pedido%20🍽️"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white font-bold py-3 px-5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all group"
        aria-label="Contáctanos por WhatsApp"
      >
        <svg className="w-7 h-7 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="hidden sm:inline text-sm">Contáctanos</span>
      </a>
    </main>
  );
}

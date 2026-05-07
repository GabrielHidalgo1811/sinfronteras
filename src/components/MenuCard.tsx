import React from 'react';

interface MenuCardProps {
  id: string;
  nombre: string;
  precio: number;
  imagen_url: string;
  cantidad_diaria: number;
  categoriaNombre: string;
  onReservar: (dish: any) => void;
}

export default function MenuCard({ id, nombre, precio, imagen_url, cantidad_diaria, categoriaNombre, onReservar }: MenuCardProps) {
  const isOutOfStock = cantidad_diaria <= 0;

  return (
    <div className={`bg-white rounded-[24px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden ${isOutOfStock ? 'grayscale opacity-80' : ''}`}>
      
      {/* Imagen */}
      <div className="relative w-full h-56 bg-gray-200">
        {imagen_url ? (
          <img src={imagen_url} alt={nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium text-lg">
            Sin imagen
          </div>
        )}
        
        {/* Categoría Badge */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-pogonia-fg px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
          {categoriaNombre}
        </div>

        {/* Agotado Badge */}
        {isOutOfStock && (
          <div className="absolute top-4 right-4 bg-pogonia-fg text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            AGOTADO
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="font-heading text-2xl mb-1 text-pogonia-fg">{nombre}</h3>
        <p className="text-pogonia-orange font-heading text-xl mb-4">${precio.toLocaleString()}</p>
        
        {/* Íconos Kids Friendly */}
        <div className="flex flex-wrap gap-2 mb-6 text-sm font-semibold">
          <span className="bg-gray-100 px-3 py-1 rounded-full shadow-sm">Plato Principal</span>
          <span className="bg-gray-100 px-3 py-1 rounded-full shadow-sm">Consomé</span>
          <span className="bg-gray-100 px-3 py-1 rounded-full shadow-sm">Ensalada</span>
          <span className="bg-gray-100 px-3 py-1 rounded-full shadow-sm">Pan</span>
          <span className="bg-gray-100 px-3 py-1 rounded-full shadow-sm">Jugo</span>
        </div>

        {/* Botón */}
        <button 
          disabled={isOutOfStock}
          onClick={() => onReservar({ id, nombre, precio, imagen_url })}
          className={`mt-auto w-full py-4 rounded-[24px] font-heading text-lg transition-all flex justify-center items-center gap-2
            ${isOutOfStock 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-pogonia-orange text-white hover:bg-orange-600 hover:shadow-[0_8px_20px_rgba(255,95,0,0.4)] active:translate-y-0'}
          `}
        >
          {isOutOfStock ? 'Agotado' : '¡Elegir este!'}
        </button>
      </div>
    </div>
  );
}

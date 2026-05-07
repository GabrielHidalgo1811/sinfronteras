import React from 'react';
import styles from './DishCard.module.css';

interface DishCardProps {
  id: string;
  nombre: string;
  precio: number;
  imagen_url: string;
  cantidad_diaria: number;
  onReservar: (dish: any) => void;
}

export default function DishCard({ id, nombre, precio, imagen_url, cantidad_diaria, onReservar }: DishCardProps) {
  const isOutOfStock = cantidad_diaria <= 0;

  return (
    <div className={`${styles.card} ${isOutOfStock ? styles.outOfStock : ''}`}>
      <div className={styles.imageContainer}>
        {imagen_url ? (
          <img src={imagen_url} alt={nombre} className={styles.image} />
        ) : (
          <div className={styles.placeholder}>Sin imagen</div>
        )}
        {isOutOfStock && <div className={styles.soldOutBadge}>AGOTADO</div>}
      </div>
      <div className={styles.content}>
        <h3 className={styles.name}>{nombre}</h3>
        <p className={styles.price}>${precio.toLocaleString()}</p>
        
        <div className={styles.iconsRow}>
          <span title="Incluye Pan">🥖</span>
          <span title="Incluye Ensalada">🥗</span>
          <span title="Incluye Consomé">🥣</span>
          <span title="Plato de Fondo">🍽️</span>
          <span title="Incluye Bebida">🥤</span>
        </div>

        <button 
          className="btn-primary" 
          disabled={isOutOfStock}
          onClick={() => onReservar({ id, nombre, precio, imagen_url })}
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {isOutOfStock ? 'Agotado' : 'Elegir'}
        </button>
      </div>
    </div>
  );
}

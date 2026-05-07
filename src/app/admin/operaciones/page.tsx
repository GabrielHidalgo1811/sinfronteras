'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import MenuCard from '@/components/MenuCard'
import BookingModal from '@/components/BookingModal'

type Pedido = {
  id: string
  plato_id: string
  tipo: 'presencial' | 'reserva'
  nombre_cliente: string | null
  telefono: string | null
  hora_retiro: string | null
  incluye_pan: boolean
  incluye_jugo: boolean
  incluye_consome: boolean
  incluye_pebre: boolean
  ensalada_id: string | null
  agregado_id: string | null
  agregado_2_id: string | null
  notas: string | null
  estado: string
  created_at: string
  platos?: { nombre: string }
  ensaladas?: { nombre: string } | null
  _isNew?: boolean
}

export default function OperacionesPage() {
  const [tab, setTab] = useState<'mesonero' | 'cocina'>('mesonero')
  const [selectedPlato, setSelectedPlato] = useState<any>(null)
  
  const [categorias, setCategorias] = useState<any[]>([])
  const [platos, setPlatos] = useState<any[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [agregados, setAgregados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  const newOrderSoundRef = useRef<HTMLAudioElement | null>(null)
  const successSoundRef = useRef<HTMLAudioElement | null>(null)

  // Initial data fetch
  const fetchData = useCallback(async () => {
    const [catsRes, platosRes, pedidosRes, agregadosRes] = await Promise.all([
      supabase.from('categorias').select('*').order('orden', { ascending: true }),
      supabase.from('platos').select('*, categorias(nombre, precio)').eq('estado_activo', true),
      supabase.from('pedidos').select('*, platos(nombre), ensaladas(nombre)').in('estado', ['pendiente', 'terminado']),
      supabase.from('agregados').select('*'),
    ])
    
    if (catsRes.data) setCategorias(catsRes.data)
    if (platosRes.data) setPlatos(platosRes.data)
    if (pedidosRes.data) setPedidos(pedidosRes.data)
    if (agregadosRes.data) setAgregados(agregadosRes.data)
    setLoading(false)
  }, [])

  // Realtime subscription
  useEffect(() => {
    fetchData()

    const channel = supabase.channel('pedidos-en-vivo')
      // New order arrives
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, async (payload) => {
        // Play sound
        newOrderSoundRef.current?.play().catch(() => {})

        // Fetch the full record with relations
        const { data: fullPedido } = await supabase
          .from('pedidos')
          .select('*, platos(nombre), ensaladas(nombre)')
          .eq('id', payload.new.id)
          .single()

        if (fullPedido) {
          // Add to state with _isNew flag for animation
          setPedidos(prev => {
            // Avoid duplicates
            if (prev.some(p => p.id === fullPedido.id)) return prev
            return [...prev, { ...fullPedido, _isNew: true }]
          })

          // Track as new for animation class
          setNewIds(prev => new Set(prev).add(fullPedido.id))

          // Remove new flag after animation completes
          setTimeout(() => {
            setNewIds(prev => {
              const next = new Set(prev)
              next.delete(fullPedido.id)
              return next
            })
          }, 1600)
        }

        // Also refresh platos to update stock counts
        const { data: freshPlatos } = await supabase
          .from('platos').select('*, categorias(nombre, precio)').eq('estado_activo', true)
        if (freshPlatos) setPlatos(freshPlatos)
      })
      // Order updated (estado changed)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, (payload) => {
        const updated = payload.new as any
        setPedidos(prev =>
          prev.map(p => p.id === updated.id ? { ...p, estado: updated.estado } : p)
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const handlePOSOrder = (dish: any) => {
    const plato = platos.find(p => p.id === dish.id)
    if (!plato || plato.cantidad_diaria <= 0) return
    setSelectedPlato(dish)
  }

  const handleModalSuccess = () => {
    setSelectedPlato(null)
    // Refresh platos for stock update
    supabase.from('platos').select('*, categorias(nombre, precio)').eq('estado_activo', true)
      .then(({ data }) => { if (data) setPlatos(data) })
  }

  // Optimistic update: remove from UI immediately, then update DB
  const handleTerminarPedido = async (pedidoId: string, tipo: string) => {
    // Start fade-out animation
    setCompletingIds(prev => new Set(prev).add(pedidoId))

    // Wait for animation to finish
    setTimeout(async () => {
      // Optimistic: remove from local state
      setPedidos(prev => prev.filter(p => p.id !== pedidoId))
      setCompletingIds(prev => {
        const next = new Set(prev)
        next.delete(pedidoId)
        return next
      })

      // Update DB in background
      const nuevoEstado = tipo === 'presencial' ? 'retirado' : 'terminado'
      await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', pedidoId)
      successSoundRef.current?.play().catch(() => {})
    }, 350)
  }

  const handleRetirarReserva = async (pedidoId: string) => {
    setCompletingIds(prev => new Set(prev).add(pedidoId))

    setTimeout(async () => {
      setPedidos(prev => prev.filter(p => p.id !== pedidoId))
      setCompletingIds(prev => {
        const next = new Set(prev)
        next.delete(pedidoId)
        return next
      })

      await supabase.from('pedidos').update({ estado: 'retirado' }).eq('id', pedidoId)
      successSoundRef.current?.play().catch(() => {})
    }, 350)
  }

  // Sort: presencial first, then reservas by hora_retiro, then by created_at
  const pedidosKDS = [...pedidos]
    .filter(p => p.estado === 'pendiente' || (p.estado === 'terminado' && p.tipo === 'reserva'))
    .sort((a, b) => {
      if (a.tipo === 'presencial' && b.tipo !== 'presencial') return -1
      if (a.tipo !== 'presencial' && b.tipo === 'presencial') return 1
      if (a.tipo === 'reserva' && b.tipo === 'reserva') {
        return (a.hora_retiro || '').localeCompare(b.hora_retiro || '')
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  return (
    <div className="max-w-7xl mx-auto">
      <audio ref={newOrderSoundRef} src="https://www.soundjay.com/buttons/sounds/bell-ringing-05.mp3" preload="auto" />
      <audio ref={successSoundRef} src="https://www.soundjay.com/buttons/sounds/button-09.mp3" preload="auto" />

      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-4xl font-heading text-pogonia-orange tracking-tight">Módulo Operativo</h1>
        <div className="flex gap-3">
          <button
            className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold transition-all text-sm sm:text-base ${
              tab === 'mesonero' ? 'bg-pogonia-orange text-white shadow-lg shadow-orange-200' : 'bg-white text-pogonia-fg shadow-sm hover:bg-gray-50'
            }`}
            onClick={() => setTab('mesonero')}
          >
            🍽️ Mesonero
          </button>
          <button
            className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold transition-all text-sm sm:text-base relative ${
              tab === 'cocina' ? 'bg-pogonia-orange text-white shadow-lg shadow-orange-200' : 'bg-white text-pogonia-fg shadow-sm hover:bg-gray-50'
            }`}
            onClick={() => setTab('cocina')}
          >
            👨‍🍳 Cocina
            {pedidosKDS.filter(p => p.estado === 'pendiente').length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {pedidosKDS.filter(p => p.estado === 'pendiente').length}
              </span>
            )}
          </button>
        </div>
      </header>

      {loading ? <p className="text-xl text-gray-500 animate-pulse">Cargando operaciones...</p> : (
        <>
          {/* ========== MESONERO ========== */}
          {tab === 'mesonero' && (
            <div className="flex flex-col gap-10">
              {categorias.map(categoria => {
                const platosCategoria = platos.filter(p => p.categoria_id === categoria.id)
                if (platosCategoria.length === 0) return null

                return (
                  <div key={categoria.id}>
                    <div className="flex items-baseline gap-4 mb-5">
                      <h2 className="text-2xl sm:text-3xl font-heading text-pogonia-fg">{categoria.nombre}</h2>
                      <span className="text-lg sm:text-xl font-heading text-pogonia-orange bg-orange-100 px-3 py-1 rounded-full">${categoria.precio.toLocaleString()}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {platosCategoria.map(plato => (
                        <MenuCard
                          key={plato.id}
                          id={plato.id}
                          nombre={plato.nombre}
                          precio={categoria.precio}
                          imagen_url={plato.imagen_url}
                          cantidad_diaria={plato.cantidad_diaria}
                          categoriaNombre={categoria.nombre}
                          onReservar={handlePOSOrder}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ========== COCINA ========== */}
          {tab === 'cocina' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
              {pedidosKDS.length === 0 && (
                <p className="text-xl sm:text-2xl text-gray-400 font-heading col-span-full text-center py-20">No hay pedidos pendientes en cocina. 🎉</p>
              )}
              
              {pedidosKDS.map(pedido => {
                const isPresencial = pedido.tipo === 'presencial'
                const isCompleting = completingIds.has(pedido.id)
                const isNew = newIds.has(pedido.id)

                return (
                  <div 
                    key={pedido.id} 
                    className={`bg-white rounded-[24px] shadow-sm overflow-hidden border-l-8 transition-all ${
                      isPresencial ? 'border-red-500' : 'border-blue-500'
                    } ${isNew ? 'order-new' : ''} ${isCompleting ? 'order-completing' : ''}`}
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-black text-gray-400 text-lg">#{pedido.id.slice(0, 4).toUpperCase()}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide text-white ${isPresencial ? 'bg-red-500' : 'bg-blue-500'}`}>
                          {isPresencial ? `Mesa ${pedido.nombre_cliente || '?'}` : `Reserva (${pedido.hora_retiro})`}
                        </span>
                      </div>
                      
                      <h3 className="text-xl sm:text-2xl font-heading text-pogonia-fg mb-3 leading-tight">{pedido.platos?.nombre}</h3>
                      
                      <ul className="space-y-2 mb-5 text-gray-700 font-medium text-sm">
                        {pedido.incluye_pan === false && <li className="line-through text-gray-400">Sin Pan</li>}
                        {pedido.incluye_jugo === false && <li className="line-through text-gray-400">Sin Jugo</li>}
                        {pedido.incluye_consome === false && <li className="line-through text-gray-400">Sin Consomé</li>}
                        {pedido.incluye_pebre === false && <li className="line-through text-gray-400">Sin Pebre</li>}
                        
                        {pedido.ensaladas && (
                          <li className="mt-2 bg-green-50 p-2.5 rounded-xl border border-green-100 text-green-700 font-bold">
                            Ensalada: {pedido.ensaladas.nombre}
                          </li>
                        )}

                        {pedido.agregado_id && (
                          <li className="mt-2 bg-orange-50 p-2.5 rounded-xl border border-orange-100 text-pogonia-orange font-bold">
                            Agregado 1: {agregados.find(a => a.id === pedido.agregado_id)?.nombre}
                          </li>
                        )}

                        {pedido.agregado_2_id && (
                          <li className="mt-1.5 bg-orange-50 p-2.5 rounded-xl border border-orange-100 text-pogonia-orange font-bold">
                            Agregado 2: {agregados.find(a => a.id === pedido.agregado_2_id)?.nombre}
                          </li>
                        )}
                        
                        {pedido.nombre_cliente && !isPresencial && (
                          <li className="mt-2 bg-gray-50 p-2.5 rounded-xl text-xs">
                            👤 <strong>Cliente:</strong> {pedido.nombre_cliente} ({pedido.telefono})
                          </li>
                        )}

                        {pedido.notas && (
                          <li className="mt-2 bg-yellow-50 p-2.5 rounded-xl border-2 border-yellow-300 text-yellow-800 font-bold text-xs">
                            📝 <strong>Nota:</strong> {pedido.notas}
                          </li>
                        )}
                      </ul>

                      {pedido.estado === 'pendiente' && (
                        <button 
                          disabled={isCompleting}
                          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50" 
                          onClick={() => handleTerminarPedido(pedido.id, pedido.tipo)}
                        >
                          ✅ Pedido Listo
                        </button>
                      )}

                      {pedido.estado === 'terminado' && pedido.tipo === 'reserva' && (
                        <button 
                          disabled={isCompleting}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50" 
                          onClick={() => handleRetirarReserva(pedido.id)}
                        >
                          📦 Pedido Listo
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {selectedPlato && (
        <BookingModal 
          dish={selectedPlato} 
          onClose={() => setSelectedPlato(null)} 
          onSuccess={handleModalSuccess} 
          isPOS={true}
        />
      )}
    </div>
  )
}

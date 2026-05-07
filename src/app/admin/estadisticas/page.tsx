'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { closeTodayManually } from '@/utils/cierreDia'

type HistorialEntry = {
  id: string
  fecha: string
  total_pedidos: number
  total_completados: number
  total_ingresos: number
  presenciales: number
  reservas: number
  plato_mas_vendido: string | null
  plato_menos_vendido: string | null
  detalle_platos: { nombre: string, count: number, ingresos: number }[]
}

export default function EstadisticasPage() {
  const [allPedidos, setAllPedidos] = useState<any[]>([])
  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [closingDay, setClosingDay] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const fetchData = async () => {
    // Today's live data
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data: todayData } = await supabase
      .from('pedidos')
      .select('*, platos(nombre, categorias(nombre, precio))')
      .gte('created_at', todayStart.toISOString())
    
    if (todayData) setAllPedidos(todayData)

    // Historical data
    const { data: historialData } = await supabase
      .from('historial_diario')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(90) // Last 90 days
    
    if (historialData) setHistorial(historialData)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()

    const channel = supabase.channel('realtime_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Today's stats (live)
  const todayStats = useMemo(() => {
    const completados = allPedidos.filter(p => p.estado === 'retirado' || p.estado === 'terminado')
    const conteo: Record<string, { nombre: string, count: number, ingresos: number }> = {}
    allPedidos.forEach(p => {
      const nombre = p.platos?.nombre || 'Desconocido'
      const precio = p.platos?.categorias?.precio || 0
      if (!conteo[nombre]) conteo[nombre] = { nombre, count: 0, ingresos: 0 }
      conteo[nombre].count++
      conteo[nombre].ingresos += precio
    })
    const ranking = Object.values(conteo).sort((a, b) => b.count - a.count)
    const ingresosTotales = ranking.reduce((sum, p) => sum + p.ingresos, 0)

    return {
      totalPedidos: allPedidos.length,
      completados: completados.length,
      pendientes: allPedidos.filter(p => p.estado === 'pendiente').length,
      ingresosTotales,
      presenciales: allPedidos.filter(p => p.tipo === 'presencial').length,
      reservas: allPedidos.filter(p => p.tipo === 'reserva').length,
      masVendido: ranking[0] || null,
      menosVendido: ranking.length > 1 ? ranking[ranking.length - 1] : null,
      ranking,
    }
  }, [allPedidos])

  // Monthly stats from historial
  const monthlyStats = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const monthEntries = historial.filter(h => {
      const d = new Date(h.fecha + 'T12:00:00')
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })

    const totalPedidos = monthEntries.reduce((s, e) => s + e.total_pedidos, 0)
    const totalIngresos = monthEntries.reduce((s, e) => s + e.total_ingresos, 0)
    const totalPresenciales = monthEntries.reduce((s, e) => s + e.presenciales, 0)
    const totalReservas = monthEntries.reduce((s, e) => s + e.reservas, 0)
    const diasTrabajados = monthEntries.length
    const promedioIngresosDia = diasTrabajados > 0 ? Math.round(totalIngresos / diasTrabajados) : 0

    // Best day
    const bestDay = monthEntries.reduce<HistorialEntry | null>((best, e) => {
      if (!best || e.total_ingresos > best.total_ingresos) return e
      return best
    }, null)

    return { monthEntries, totalPedidos, totalIngresos, totalPresenciales, totalReservas, diasTrabajados, promedioIngresosDia, bestDay }
  }, [historial, selectedMonth])

  // Available months for selector
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    const now = new Date()
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    historial.forEach(h => {
      const d = new Date(h.fecha + 'T12:00:00')
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    })
    return Array.from(months).sort().reverse()
  }, [historial])

  const [showEndShiftModal, setShowEndShiftModal] = useState(false)

  const handleEndShift = async () => {
    setClosingDay(true)
    try {
      const result = await closeTodayManually()
      setShowEndShiftModal(false)
      alert(`✅ Jornada finalizada.\n\n📅 Fecha: ${result.fecha}\n🍽️ Pedidos archivados: ${result.pedidos}\n💰 Ingresos: $${todayStats.ingresosTotales.toLocaleString()}\n\nTodos los datos quedaron guardados en el historial.`)
      fetchData()
    } catch (e: any) {
      alert(`❌ Error: ${e?.message || 'Verifica que la tabla historial_diario exista en Supabase.'}`)
      console.error('End shift error:', e)
    }
    setClosingDay(false)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatMonth = (monthStr: string) => {
    const [y, m] = monthStr.split('-')
    const d = new Date(parseInt(y), parseInt(m) - 1, 1)
    return d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-4xl font-heading text-pogonia-orange tracking-tight">📊 Estadísticas</h1>
        <button
          onClick={() => setShowEndShiftModal(true)}
          disabled={closingDay}
          className="bg-red-600 text-white font-bold py-2.5 px-5 rounded-xl hover:bg-red-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
        >
          🔒 Terminar Jornada
        </button>
      </div>

      {/* ===== MODAL: Terminar Jornada ===== */}
      {showEndShiftModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !closingDay && setShowEndShiftModal(false)}>
          <div className="bg-white rounded-[24px] max-w-md w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-red-600 p-6 text-white text-center">
              <p className="text-4xl mb-2">🔒</p>
              <h3 className="font-heading text-2xl">Terminar Jornada</h3>
              <p className="text-red-200 text-sm mt-1">¿Seguro que quiere acabar el turno?</p>
            </div>
            
            <div className="p-6">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Resumen a archivar:</p>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-pogonia-bg rounded-xl p-3 text-center">
                  <p className="font-heading text-2xl text-pogonia-orange">{todayStats.totalPedidos}</p>
                  <p className="text-[11px] font-bold text-gray-500">Pedidos</p>
                </div>
                <div className="bg-pogonia-bg rounded-xl p-3 text-center">
                  <p className="font-heading text-2xl text-pogonia-fg">${todayStats.ingresosTotales.toLocaleString()}</p>
                  <p className="text-[11px] font-bold text-gray-500">Ingresos</p>
                </div>
                <div className="bg-pogonia-bg rounded-xl p-3 text-center">
                  <p className="font-heading text-2xl text-red-500">{todayStats.presenciales}</p>
                  <p className="text-[11px] font-bold text-gray-500">Presenciales</p>
                </div>
                <div className="bg-pogonia-bg rounded-xl p-3 text-center">
                  <p className="font-heading text-2xl text-blue-500">{todayStats.reservas}</p>
                  <p className="text-[11px] font-bold text-gray-500">Reservas</p>
                </div>
              </div>

              {todayStats.masVendido && (
                <div className="bg-green-50 rounded-xl p-3 mb-3 border border-green-100">
                  <p className="text-xs font-bold text-green-600">🏆 Más vendido: {todayStats.masVendido.nombre} ({todayStats.masVendido.count} uds)</p>
                </div>
              )}

              {todayStats.totalPedidos === 0 && (
                <div className="bg-yellow-50 rounded-xl p-3 mb-3 border border-yellow-200">
                  <p className="text-xs font-bold text-yellow-700">⚠️ No hay pedidos hoy. No se puede archivar una jornada vacía.</p>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowEndShiftModal(false)}
                  disabled={closingDay}
                  className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  No, Cancelar
                </button>
                <button
                  onClick={handleEndShift}
                  disabled={closingDay || todayStats.totalPedidos === 0}
                  className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {closingDay ? 'Guardando...' : 'Sí, Terminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? <p className="text-xl text-gray-500 animate-pulse">Cargando estadísticas...</p> : (
        <div className="flex flex-col gap-8">
          
          {/* ===================== HOY EN VIVO ===================== */}
          <div>
            <h2 className="text-lg font-heading text-pogonia-fg mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              Hoy en Vivo
            </h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-[18px] p-4 shadow-sm text-center">
                <p className="text-2xl sm:text-3xl font-heading text-pogonia-orange">{todayStats.totalPedidos}</p>
                <p className="text-xs font-bold text-gray-500 mt-1">Pedidos</p>
              </div>
              <div className="bg-white rounded-[18px] p-4 shadow-sm text-center">
                <p className="text-2xl sm:text-3xl font-heading text-green-500">{todayStats.completados}</p>
                <p className="text-xs font-bold text-gray-500 mt-1">Completados</p>
              </div>
              <div className="bg-white rounded-[18px] p-4 shadow-sm text-center">
                <p className="text-2xl sm:text-3xl font-heading text-yellow-500">{todayStats.pendientes}</p>
                <p className="text-xs font-bold text-gray-500 mt-1">Pendientes</p>
              </div>
              <div className="bg-white rounded-[18px] p-4 shadow-sm text-center">
                <p className="text-2xl sm:text-3xl font-heading text-pogonia-fg">${todayStats.ingresosTotales.toLocaleString()}</p>
                <p className="text-xs font-bold text-gray-500 mt-1">Ingresos</p>
              </div>
            </div>

            {/* Top / Bottom today */}
            {todayStats.ranking.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {todayStats.masVendido && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-[18px] p-4 shadow-sm border border-green-100">
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">🏆 Más Vendido</p>
                    <p className="font-heading text-lg text-pogonia-fg">{todayStats.masVendido.nombre}</p>
                    <p className="text-sm font-bold text-green-600 mt-1">{todayStats.masVendido.count} uds • ${todayStats.masVendido.ingresos.toLocaleString()}</p>
                  </div>
                )}
                {todayStats.menosVendido && (
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-[18px] p-4 shadow-sm border border-red-100">
                    <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">📉 Menos Vendido</p>
                    <p className="font-heading text-lg text-pogonia-fg">{todayStats.menosVendido.nombre}</p>
                    <p className="text-sm font-bold text-red-500 mt-1">{todayStats.menosVendido.count} uds • ${todayStats.menosVendido.ingresos.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===================== RESUMEN MENSUAL ===================== */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading text-pogonia-fg">📅 Resumen Mensual</h2>
              <select 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)}
                className="p-2 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-pogonia-orange outline-none bg-white capitalize"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonth(m)}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-[18px] p-4 shadow-sm text-center">
                <p className="text-2xl sm:text-3xl font-heading text-pogonia-orange">${monthlyStats.totalIngresos.toLocaleString()}</p>
                <p className="text-xs font-bold text-gray-500 mt-1">Ingresos del Mes</p>
              </div>
              <div className="bg-white rounded-[18px] p-4 shadow-sm text-center">
                <p className="text-2xl sm:text-3xl font-heading text-pogonia-fg">{monthlyStats.totalPedidos}</p>
                <p className="text-xs font-bold text-gray-500 mt-1">Pedidos Total</p>
              </div>
              <div className="bg-white rounded-[18px] p-4 shadow-sm text-center">
                <p className="text-2xl sm:text-3xl font-heading text-blue-500">{monthlyStats.diasTrabajados}</p>
                <p className="text-xs font-bold text-gray-500 mt-1">Días Trabajados</p>
              </div>
              <div className="bg-white rounded-[18px] p-4 shadow-sm text-center">
                <p className="text-2xl sm:text-3xl font-heading text-green-500">${monthlyStats.promedioIngresosDia.toLocaleString()}</p>
                <p className="text-xs font-bold text-gray-500 mt-1">Promedio/Día</p>
              </div>
            </div>

            {/* Desglose mensual por tipo */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-[18px] p-4 shadow-sm flex items-center gap-3">
                <span className="w-9 h-9 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-base">🍽️</span>
                <div>
                  <p className="font-heading text-lg text-pogonia-fg">{monthlyStats.totalPresenciales}</p>
                  <p className="text-xs font-bold text-gray-500">Presenciales</p>
                </div>
              </div>
              <div className="bg-white rounded-[18px] p-4 shadow-sm flex items-center gap-3">
                <span className="w-9 h-9 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center text-base">📦</span>
                <div>
                  <p className="font-heading text-lg text-pogonia-fg">{monthlyStats.totalReservas}</p>
                  <p className="text-xs font-bold text-gray-500">Reservas</p>
                </div>
              </div>
            </div>

            {/* Best day */}
            {monthlyStats.bestDay && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-[18px] p-4 shadow-sm border border-yellow-200 mb-4">
                <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-1">⭐ Mejor Día del Mes</p>
                <div className="flex justify-between items-center">
                  <p className="font-heading text-lg text-pogonia-fg capitalize">{formatDate(monthlyStats.bestDay.fecha)}</p>
                  <p className="font-heading text-xl text-yellow-700">${monthlyStats.bestDay.total_ingresos.toLocaleString()} <span className="text-sm font-bold text-gray-500">({monthlyStats.bestDay.total_pedidos} pedidos)</span></p>
                </div>
              </div>
            )}
          </div>

          {/* ===================== HISTORIAL DÍA A DÍA ===================== */}
          <div>
            <h2 className="text-lg font-heading text-pogonia-fg mb-4">📋 Historial Día a Día</h2>
            
            {monthlyStats.monthEntries.length === 0 ? (
              <div className="bg-white rounded-[18px] p-8 shadow-sm text-center">
                <p className="text-gray-400 font-medium">No hay registros para este mes.</p>
                <p className="text-sm text-gray-400 mt-1">Los datos se archivan al iniciar un nuevo día o al presionar "Cerrar Día".</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {monthlyStats.monthEntries
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map(entry => (
                  <div key={entry.id} className="bg-white rounded-[18px] shadow-sm overflow-hidden">
                    {/* Summary row */}
                    <button 
                      onClick={() => setExpandedDay(expandedDay === entry.id ? null : entry.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-heading text-pogonia-fg capitalize whitespace-nowrap">{formatDate(entry.fecha)}</span>
                        <span className="text-xs font-bold text-gray-400">{entry.total_pedidos} pedidos</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-heading text-lg text-pogonia-orange">${entry.total_ingresos.toLocaleString()}</span>
                        <span className={`text-gray-400 transition-transform duration-200 ${expandedDay === entry.id ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {expandedDay === entry.id && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-center">
                          <div className="bg-pogonia-bg rounded-xl p-2">
                            <p className="font-heading text-sm text-pogonia-fg">{entry.total_completados}</p>
                            <p className="text-[10px] font-bold text-gray-500">Completados</p>
                          </div>
                          <div className="bg-pogonia-bg rounded-xl p-2">
                            <p className="font-heading text-sm text-pogonia-fg">{entry.presenciales}</p>
                            <p className="text-[10px] font-bold text-gray-500">Presenciales</p>
                          </div>
                          <div className="bg-pogonia-bg rounded-xl p-2">
                            <p className="font-heading text-sm text-pogonia-fg">{entry.reservas}</p>
                            <p className="text-[10px] font-bold text-gray-500">Reservas</p>
                          </div>
                          <div className="bg-pogonia-bg rounded-xl p-2">
                            <p className="font-heading text-sm text-pogonia-fg">${entry.total_ingresos.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-gray-500">Total</p>
                          </div>
                        </div>

                        {entry.plato_mas_vendido && (
                          <p className="text-xs font-bold text-green-600 mb-1">🏆 Más vendido: {entry.plato_mas_vendido}</p>
                        )}
                        {entry.plato_menos_vendido && (
                          <p className="text-xs font-bold text-red-500 mb-2">📉 Menos vendido: {entry.plato_menos_vendido}</p>
                        )}

                        {/* Detalle platos */}
                        {entry.detalle_platos && entry.detalle_platos.length > 0 && (
                          <div className="flex flex-col gap-1.5 mt-2">
                            {entry.detalle_platos.map((p, i) => (
                              <div key={p.nombre} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    i === 0 ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500'
                                  }`}>{i + 1}</span>
                                  <span className="font-bold text-pogonia-fg">{p.nombre}</span>
                                </div>
                                <span className="font-bold text-gray-500">{p.count} uds • ${p.ingresos.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

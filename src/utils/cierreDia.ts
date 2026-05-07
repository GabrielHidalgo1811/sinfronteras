import { supabase } from '@/lib/supabase'

/**
 * Verifica si es un nuevo día comparando con la última fecha registrada en historial.
 * Si es nuevo día: archiva las estadísticas de ayer automáticamente.
 * NOTA: No toca los platos. El admin decide manualmente cuándo activarlos/desactivarlos.
 */
export async function checkAndCloseDayIfNeeded(): Promise<{ isNewDay: boolean; closedDate?: string }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD

  // Check if today already has an entry (meaning day was already closed or is current)
  const { data: todayEntry } = await supabase
    .from('historial_diario')
    .select('id')
    .eq('fecha', todayStr)
    .maybeSingle()

  if (todayEntry) {
    // Today already processed, no action needed
    return { isNewDay: false }
  }

  // Find yesterday's pedidos to archive
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const yesterdayStart = new Date(yesterday)
  yesterdayStart.setHours(0, 0, 0, 0)
  const yesterdayEnd = new Date(yesterday)
  yesterdayEnd.setHours(23, 59, 59, 999)

  // Check if yesterday has data worth archiving
  const { data: yesterdayPedidos } = await supabase
    .from('pedidos')
    .select('*, platos(nombre, categorias(precio))')
    .gte('created_at', yesterdayStart.toISOString())
    .lte('created_at', yesterdayEnd.toISOString())

  if (yesterdayPedidos && yesterdayPedidos.length > 0) {
    // Check if yesterday wasn't already archived
    const { data: yesterdayEntry } = await supabase
      .from('historial_diario')
      .select('id')
      .eq('fecha', yesterdayStr)
      .maybeSingle()

    if (!yesterdayEntry) {
      await archiveDayStats(yesterdayStr, yesterdayPedidos)
    }
  }

  return { isNewDay: true, closedDate: yesterdayStr }
}

/**
 * Archives a day's stats into historial_diario
 */
async function archiveDayStats(fecha: string, pedidos: any[]) {
  const completados = pedidos.filter(p => p.estado === 'retirado' || p.estado === 'terminado')
  const presenciales = pedidos.filter(p => p.tipo === 'presencial').length
  const reservas = pedidos.filter(p => p.tipo === 'reserva').length

  // Count by plato
  const conteo: Record<string, { nombre: string, count: number, ingresos: number }> = {}
  pedidos.forEach(p => {
    const nombre = p.platos?.nombre || 'Desconocido'
    const precio = p.platos?.categorias?.precio || 0
    if (!conteo[nombre]) {
      conteo[nombre] = { nombre, count: 0, ingresos: 0 }
    }
    conteo[nombre].count++
    conteo[nombre].ingresos += precio
  })

  const ranking = Object.values(conteo).sort((a, b) => b.count - a.count)
  const totalIngresos = ranking.reduce((sum, p) => sum + p.ingresos, 0)

  const { error } = await supabase.from('historial_diario').insert([{
    fecha,
    total_pedidos: pedidos.length,
    total_completados: completados.length,
    total_ingresos: totalIngresos,
    presenciales,
    reservas,
    plato_mas_vendido: ranking[0]?.nombre || null,
    plato_menos_vendido: ranking.length > 1 ? ranking[ranking.length - 1]?.nombre : null,
    detalle_platos: ranking,
  }])

  if (error) {
    console.error('Error archivando stats:', error)
    throw new Error(`Error al guardar en historial: ${error.message}`)
  }
}

/**
 * Manually close the current day (useful for end-of-day button)
 */
export async function closeTodayManually(): Promise<{ fecha: string, pedidos: number }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const todayEnd = new Date()

  const { data: todayPedidos, error: fetchError } = await supabase
    .from('pedidos')
    .select('*, platos(nombre, categorias(precio))')
    .gte('created_at', today.toISOString())
    .lte('created_at', todayEnd.toISOString())

  if (fetchError) {
    console.error('Error fetching pedidos:', fetchError)
    throw new Error(`Error al buscar pedidos: ${fetchError.message}`)
  }

  if (!todayPedidos || todayPedidos.length === 0) {
    throw new Error('No hay pedidos registrados hoy para archivar.')
  }

  // Delete existing entry for today if exists (re-archive)
  const { error: delError } = await supabase.from('historial_diario').delete().eq('fecha', todayStr)
  if (delError) {
    console.error('Error deleting old entry:', delError)
    // Continue anyway - might not exist yet
  }

  await archiveDayStats(todayStr, todayPedidos)

  return { fecha: todayStr, pedidos: todayPedidos.length }
}


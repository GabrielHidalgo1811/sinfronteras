'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const [platos, setPlatos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [ensaladas, setEnsaladas] = useState<any[]>([])
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showNewDishForm, setShowNewDishForm] = useState(false)
  const [showNewEnsaladaForm, setShowNewEnsaladaForm] = useState(false)

  const [newEnsalada, setNewEnsalada] = useState('')
  const [editingEnsalada, setEditingEnsalada] = useState<string | null>(null)
  const [editEnsaladaName, setEditEnsaladaName] = useState('')

  const [newDish, setNewDish] = useState({ nombre: '', categoria_id: '' })
  const [file, setFile] = useState<File | null>(null)
  
  const [editingPlato, setEditingPlato] = useState<string | null>(null)
  const [editDish, setEditDish] = useState({ nombre: '', categoria_id: '' })
  const [editFile, setEditFile] = useState<File | null>(null)

  const fetchData = async () => {
    const { data: catsData } = await supabase.from('categorias').select('*').order('orden', { ascending: true })
    const { data: platosData } = await supabase.from('platos').select('*, categorias(nombre)').order('created_at', { ascending: false })
    const { data: pedidosData } = await supabase.from('pedidos').select('*, platos(nombre)')
    const { data: ensaladasData } = await supabase.from('ensaladas').select('*').order('created_at', { ascending: false })
    
    if (catsData) setCategorias(catsData)
    if (platosData) setPlatos(platosData)
    if (pedidosData) setPedidos(pedidosData)
    if (ensaladasData) setEnsaladas(ensaladasData)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleToggleActive = async (id: string, current: boolean) => {
    let newQty = 0;
    if (!current) {
      const promptQty = prompt('Cantidad de servicios para hoy:')
      if (promptQty === null) return;
      newQty = parseInt(promptQty) || 0
    }
    
    await supabase.from('platos').update({ estado_activo: !current, cantidad_diaria: newQty }).eq('id', id)
    fetchData()
  }

  const handleToggleEnsalada = async (id: string, current: boolean) => {
    await supabase.from('ensaladas').update({ estado_activo: !current }).eq('id', id)
    fetchData()
  }

  const handleUpdateQty = async (id: string, qty: number) => {
    await supabase.from('platos').update({ cantidad_diaria: qty }).eq('id', id)
    fetchData()
  }

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDish.nombre || !newDish.categoria_id) {
      alert('Por favor completa el nombre y la categoría del plato.')
      return
    }

    let imagen_url = ''
    if (file) {
      const fileName = `${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('platos_images')
        .upload(fileName, file)
      
      if (uploadError) {
        console.error('Error subiendo imagen:', uploadError)
        // Continue without image
      } else {
        const { data: publicUrlData } = supabase.storage.from('platos_images').getPublicUrl(fileName)
        imagen_url = publicUrlData.publicUrl
      }
    }

    const { error: insertError } = await supabase.from('platos').insert([{
      nombre: newDish.nombre,
      categoria_id: newDish.categoria_id,
      imagen_url
    }])

    if (insertError) {
      alert(`❌ Error al crear el plato: ${insertError.message}`)
      console.error('Insert error:', insertError)
      return
    }

    setNewDish({ nombre: '', categoria_id: '' })
    setFile(null)
    setShowNewDishForm(false)
    fetchData()
    alert('✅ Plato creado correctamente')
  }

  const handleCreateEnsalada = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEnsalada) return

    await supabase.from('ensaladas').insert([{
      nombre: newEnsalada,
      estado_activo: true
    }])

    setNewEnsalada('')
    setShowNewEnsaladaForm(false)
    fetchData()
  }

  const handleUpdateEnsalada = async (e: React.FormEvent, id: string) => {
    e.preventDefault()
    if (!editEnsaladaName) return
    await supabase.from('ensaladas').update({ nombre: editEnsaladaName }).eq('id', id)
    setEditingEnsalada(null)
    fetchData()
  }

  const handleUpdatePlato = async (e: React.FormEvent, id: string, currentImage: string) => {
    e.preventDefault()
    if (!editDish.nombre || !editDish.categoria_id) return

    let imagen_url = currentImage
    if (editFile) {
      const fileName = `${Date.now()}_${editFile.name}`
      const { error: uploadError } = await supabase.storage.from('platos_images').upload(fileName, editFile)
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('platos_images').getPublicUrl(fileName)
        imagen_url = publicUrlData.publicUrl
      }
    }

    await supabase.from('platos').update({
      nombre: editDish.nombre,
      categoria_id: editDish.categoria_id,
      imagen_url
    }).eq('id', id)

    setEditingPlato(null)
    setEditFile(null)
    fetchData()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl sm:text-4xl font-heading text-pogonia-orange mb-6 tracking-tight">Panel de Administración</h1>

      {loading ? <p className="text-xl text-gray-500 animate-pulse">Cargando datos...</p> : (
        <div className="flex flex-col gap-6">
          
          {/* ======== CREAR PLATO (Colapsable) ======== */}
          <section className="bg-white rounded-[24px] shadow-sm overflow-hidden">
            <button 
              onClick={() => setShowNewDishForm(!showNewDishForm)}
              className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-xl sm:text-2xl font-heading text-pogonia-fg flex items-center gap-3">
                ➕ Agregar Nuevo Plato
              </h2>
              <span className={`text-2xl text-gray-400 transition-transform duration-300 ${showNewDishForm ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {showNewDishForm && (
              <div className="px-5 sm:px-6 pb-6 border-t border-gray-100">
                <form onSubmit={handleCreateDish} className="flex flex-col gap-4 pt-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Nombre</label>
                    <input className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-pogonia-orange outline-none" value={newDish.nombre} onChange={e => setNewDish({...newDish, nombre: e.target.value})} required placeholder="Ej: Lomo Saltado" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Categoría</label>
                    <select className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-pogonia-orange outline-none bg-white" value={newDish.categoria_id} onChange={e => setNewDish({...newDish, categoria_id: e.target.value})} required>
                      <option value="">Seleccionar...</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre} (${c.precio})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Imagen</label>
                    <input type="file" className="w-full p-2 border-2 border-gray-200 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-orange-50 file:text-pogonia-orange hover:file:bg-orange-100" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="flex-1 bg-pogonia-orange text-white font-bold py-3 px-6 rounded-xl hover:bg-orange-600 transition-colors">Crear Plato</button>
                    <button type="button" onClick={() => setShowNewDishForm(false)} className="py-3 px-6 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">Cancelar</button>
                  </div>
                </form>
              </div>
            )}
          </section>

          {/* ======== GESTIÓN DE MENÚ ======== */}
          <section className="bg-white p-5 sm:p-8 rounded-[24px] shadow-sm">
            <h2 className="text-xl sm:text-2xl font-heading mb-5 text-pogonia-fg">Gestión de Menú del Día</h2>
            <div className="flex flex-col gap-3">
              {platos.map(plato => (
                <div key={plato.id} className="bg-pogonia-bg p-3 sm:p-4 rounded-2xl">
                  {editingPlato === plato.id ? (
                    <form onSubmit={(e) => handleUpdatePlato(e, plato.id, plato.imagen_url)} className="flex flex-col gap-3">
                      <input className="w-full p-2 border-2 border-gray-200 rounded-xl outline-none text-sm" value={editDish.nombre} onChange={e => setEditDish({...editDish, nombre: e.target.value})} required placeholder="Nombre" />
                      <select className="w-full p-2 border-2 border-gray-200 rounded-xl outline-none text-sm bg-white" value={editDish.categoria_id} onChange={e => setEditDish({...editDish, categoria_id: e.target.value})} required>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                      <input type="file" className="w-full p-1 text-xs border-2 border-gray-200 rounded-xl" accept="image/*" onChange={e => setEditFile(e.target.files?.[0] || null)} />
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-green-500 text-white font-bold py-2 px-3 rounded-xl text-sm">Guardar</button>
                        <button type="button" onClick={() => setEditingPlato(null)} className="flex-1 bg-gray-400 text-white font-bold py-2 px-3 rounded-xl text-sm">Cancelar</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {/* Row 1: Info */}
                      <div className="flex items-center gap-3 mb-3">
                        {plato.imagen_url ? (
                           <img src={plato.imagen_url} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover shadow-sm flex-shrink-0" />
                        ) : (
                           <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0 text-sm">🍽️</div>
                        )}
                        <div className="min-w-0">
                          <p className="font-heading font-bold text-base sm:text-lg text-pogonia-fg truncate">{plato.nombre}</p>
                          <p className="text-xs sm:text-sm font-bold text-gray-500">{plato.categorias?.nombre}</p>
                        </div>
                      </div>
                      
                      {/* Row 2: Controls */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <button 
                          onClick={() => {
                            setEditingPlato(plato.id)
                            setEditDish({ nombre: plato.nombre, categoria_id: plato.categoria_id })
                          }}
                          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-3 rounded-lg transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        
                        {plato.estado_activo && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-700">Stock:</span>
                            <input 
                              type="number" 
                              className="w-16 p-1.5 border-2 border-gray-200 rounded-lg text-center text-sm font-bold focus:border-pogonia-orange outline-none" 
                              value={plato.cantidad_diaria} 
                              onChange={e => handleUpdateQty(plato.id, parseInt(e.target.value) || 0)} 
                            />
                          </div>
                        )}
                        
                        <label className="flex items-center cursor-pointer ml-auto">
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={plato.estado_activo}
                              onChange={() => handleToggleActive(plato.id, plato.estado_activo)}
                            />
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                          </div>
                          <span className="ml-2 text-xs font-bold text-gray-700">{plato.estado_activo ? 'Activo' : 'Off'}</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ======== GESTIÓN DE ENSALADAS ======== */}
          <section className="bg-white rounded-[24px] shadow-sm overflow-hidden">
            <div className="p-5 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl sm:text-2xl font-heading text-pogonia-fg">Gestión de Ensaladas</h2>
                <button 
                  onClick={() => setShowNewEnsaladaForm(!showNewEnsaladaForm)}
                  className="bg-pogonia-orange text-white font-bold py-2 px-4 rounded-xl hover:bg-orange-600 transition-colors text-sm"
                >
                  {showNewEnsaladaForm ? 'Cancelar' : '➕ Añadir'}
                </button>
              </div>

              {showNewEnsaladaForm && (
                <form onSubmit={handleCreateEnsalada} className="flex gap-3 mb-5">
                  <input 
                    className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-pogonia-orange outline-none text-sm" 
                    placeholder="Nombre de la ensalada (ej. Mixta)" 
                    value={newEnsalada} 
                    onChange={e => setNewEnsalada(e.target.value)} 
                    required 
                  />
                  <button type="submit" className="bg-pogonia-orange text-white font-bold py-3 px-5 rounded-xl hover:bg-orange-600 transition-colors text-sm whitespace-nowrap">
                    Crear
                  </button>
                </form>
              )}

              <div className="flex flex-col gap-3">
                {ensaladas.map(ens => (
                  <div key={ens.id} className="flex items-center justify-between bg-pogonia-bg p-3 sm:p-4 rounded-2xl gap-3">
                    {editingEnsalada === ens.id ? (
                      <form onSubmit={(e) => handleUpdateEnsalada(e, ens.id)} className="flex flex-1 gap-3">
                        <input className="flex-1 p-2 border-2 border-gray-200 rounded-xl outline-none text-sm" value={editEnsaladaName} onChange={e => setEditEnsaladaName(e.target.value)} required />
                        <button type="submit" className="bg-green-500 text-white font-bold py-2 px-3 rounded-xl text-sm">OK</button>
                        <button type="button" onClick={() => setEditingEnsalada(null)} className="bg-gray-400 text-white font-bold py-2 px-3 rounded-xl text-sm">✕</button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-3 min-w-0">
                        <p className="font-heading font-bold text-base text-pogonia-fg truncate">{ens.nombre}</p>
                        <button 
                          onClick={() => {
                            setEditingEnsalada(ens.id)
                            setEditEnsaladaName(ens.nombre)
                          }}
                          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-2 rounded-lg transition-colors flex-shrink-0"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                    
                    <label className="flex items-center cursor-pointer flex-shrink-0">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={ens.estado_activo}
                          onChange={() => handleToggleEnsalada(ens.id, ens.estado_activo)}
                        />
                        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                      </div>
                      <span className="ml-2 text-xs font-bold text-gray-700 hidden sm:inline">{ens.estado_activo ? 'Disponible' : 'Agotada'}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  )
}

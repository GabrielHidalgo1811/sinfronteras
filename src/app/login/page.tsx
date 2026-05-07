import { login } from './actions'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="min-h-screen bg-pogonia-bg flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[32px] shadow-sm w-full max-w-md text-center">
        <h1 className="text-3xl font-heading text-pogonia-fg tracking-tight mb-2">
          Colaciones <span className="text-pogonia-orange">Sin Frontera</span>
        </h1>
        <p className="text-gray-500 font-medium mb-8">Acceso Administrativo</p>
        
        <form className="flex flex-col gap-4">
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Correo Electrónico"
            className="w-full p-4 border-2 border-gray-200 rounded-2xl outline-none focus:border-pogonia-orange transition-colors font-medium bg-gray-50"
          />
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Contraseña"
            className="w-full p-4 border-2 border-gray-200 rounded-2xl outline-none focus:border-pogonia-orange transition-colors font-medium bg-gray-50"
          />
          
          {searchParams?.error && (
            <p className="text-red-500 font-bold text-sm bg-red-50 py-2 rounded-xl">
              Credenciales inválidas. Inténtalo de nuevo.
            </p>
          )}

          <button 
            formAction={login} 
            className="mt-4 w-full bg-pogonia-orange text-white font-heading font-bold text-xl py-4 rounded-[24px] hover:bg-orange-600 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(255,95,0,0.4)] active:translate-y-0 transition-all"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )
}

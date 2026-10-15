import { NavLink, Outlet } from 'react-router-dom'
import { Boxes, Languages, Package, Shapes } from 'lucide-react'

const navigationItems = [
  { to: '/products', label: 'Ürünler', icon: Package },
  { to: '/categories', label: 'Kategoriler', icon: Shapes },
]

function App() {
  return (
    <div className="min-h-screen bg-paper text-ink md:flex">
      <aside className="flex w-full shrink-0 flex-col bg-forest text-white md:min-h-screen md:w-64">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
          <div className="grid size-10 place-items-center rounded-xl bg-lime text-forest"><Languages size={21} strokeWidth={2.5} /></div>
          <div><p className="font-display text-lg font-semibold leading-tight">Çeviri Lab</p><p className="mt-1 text-xs text-white/55">ÇEVİRİ KATALOĞU</p></div>
        </div>
        <nav className="flex gap-2 p-4 md:flex-col" aria-label="Katalog bölümleri">
          {navigationItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
              to={to}
              end
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 px-6 py-5 md:block">
          <div className="flex items-center justify-between text-xs text-white/60"><span>DİLLER</span><span>03 / 03</span></div>
          <div className="mt-3 flex gap-2">{['tr', 'en', 'fr'].map((code) => <span key={code} className="rounded-md border border-white/15 px-2 py-1 font-mono text-xs uppercase text-white/80">{code}</span>)}</div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center gap-2 border-b border-line bg-white px-5 py-4 text-sm text-muted md:px-9">
          <Boxes size={17} />
          <span>Katalog</span>
        </header>
        <div className="mx-auto w-full max-w-[1320px] px-5 py-8 md:px-9 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default App

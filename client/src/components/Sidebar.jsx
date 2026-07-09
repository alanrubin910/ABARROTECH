import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Truck, Scissors, BarChart2, Store, KeyRound } from 'lucide-react';

const nav = [
  { to: '/pos',              icon: ShoppingCart, label: 'Venta',    labelFull: 'Punto de Venta'   },
  { to: '/almacen',         icon: Package,      label: 'Almacén',  labelFull: 'Almacén'           },
  { to: '/reabastecimiento', icon: Truck,        label: 'Pedidos',  labelFull: 'Reabastecimiento'  },
  { to: '/corte',           icon: Scissors,     label: 'Corte',    labelFull: 'Corte de Caja'     },
  { to: '/reportes',        icon: BarChart2,    label: 'Reportes', labelFull: 'Reportes'          },
  { to: '/owner',           icon: KeyRound,     label: 'Dueño',    labelFull: 'Panel del Dueño'   },
];

/* ── Desktop: sidebar izquierdo ─────────────────────────────── */
export function DesktopSidebar() {
  return (
    <aside className="hidden md:flex w-56 flex-shrink-0 bg-gradient-to-b from-brand-600 to-brand-700 flex-col shadow-xl">
      <div className="flex items-center gap-3 px-5 py-6 border-b border-brand-500">
        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow">
          <Store className="text-brand-600" size={20} />
        </div>
        <div>
          <p className="text-white font-bold text-base leading-tight">AbarroTech</p>
          <p className="text-brand-200 text-xs">Sistema POS</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {nav.map(({ to, icon: Icon, labelFull }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-brand-100 hover:bg-brand-500 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {labelFull}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-brand-500">
        <p className="text-brand-300 text-xs text-center">v1.0.0 · Red local</p>
      </div>
    </aside>
  );
}

/* ── Móvil: barra inferior ──────────────────────────────────── */
export function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-700 border-t border-brand-500 flex items-center justify-around px-1 py-1 safe-area-inset-bottom">
      {nav.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-center transition-all duration-150 min-w-0 flex-1 ${
              isActive
                ? 'bg-white text-brand-700'
                : 'text-brand-200 hover:text-white'
            }`
          }
        >
          <Icon size={20} />
          <span className="text-[10px] font-semibold leading-tight">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/* Default export (ambos) */
export default function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileBottomNav />
    </>
  );
}

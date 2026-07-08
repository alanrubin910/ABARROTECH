import { useState, useEffect } from 'react';
import { Scissors, Banknote, CreditCard, ArrowLeftRight, UserCircle, CheckCircle, Clock, Package, AlertTriangle } from 'lucide-react';

const API = '/api';
const fmt = (n) => `$${Number(n).toFixed(2)}`;

export default function CorteDeCaja() {
  const [corte, setCorte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closingSession, setClosingSession] = useState(null);
  const d = new Date();
  const today = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');

  useEffect(() => { fetchCorte(); }, []);

  async function fetchCorte() {
    setLoading(true);
    const r = await fetch(`${API}/reports/corte?date=${today}`);
    const data = await r.json();
    setCorte(data);
    setLoading(false);
  }

  async function closeSession(sessionId) {
    setClosingSession(sessionId);
    await fetch(`${API}/sessions/${sessionId}/close`, { method: 'PUT' });
    setClosingSession(null);
    fetchCorte();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const g = corte?.globalTotal || {};

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800">Corte de Caja</h1>
        <p className="text-slate-500 text-sm">Resumen del día — {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Global totals */}
      <div className="card bg-gradient-to-br from-brand-500 to-brand-700 text-white border-0">
        <p className="text-brand-100 text-sm font-semibold mb-1">Total del día</p>
        <p className="text-5xl font-black mb-4">{fmt(g.total_importe || 0)}</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Efectivo', value: g.efectivo || 0, icon: Banknote, cls: 'bg-green-400/20 text-green-100' },
            { label: 'Tarjeta', value: g.tarjeta || 0, icon: CreditCard, cls: 'bg-blue-400/20 text-blue-100' },
            { label: 'Transferencia', value: g.transferencia || 0, icon: ArrowLeftRight, cls: 'bg-purple-400/20 text-purple-100' },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className={`${cls} rounded-xl p-3`}>
              <Icon size={16} className="mb-1 opacity-80" />
              <p className="text-sm font-bold">{fmt(value)}</p>
              <p className="text-xs opacity-70">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-brand-400 flex gap-6 text-sm">
          <div>
            <p className="text-brand-200 text-xs">Ventas totales</p>
            <p className="font-bold">{g.total_ventas || 0}</p>
          </div>
        </div>
      </div>

      {/* Per cashier */}
      <div>
        <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
          <UserCircle size={18} className="text-brand-500" /> Detalle por cajero
        </h2>
        {corte?.sessions?.length === 0 ? (
          <div className="card text-center py-10 text-slate-400">
            <Clock size={32} className="mx-auto mb-2 opacity-30" />
            <p>No hay cajas abiertas hoy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {corte?.sessions?.map(session => (
              <div key={session.id} className={`card border-l-4 ${session.status === 'open' ? 'border-l-amber-400' : 'border-l-accent-500'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <UserCircle size={20} className="text-brand-500" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{session.cashier_name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          session.status === 'open'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {session.opened_at?.split(' ')[1]?.substring(0,5)} hrs
                          {session.closed_at ? ` → ${session.closed_at?.split(' ')[1]?.substring(0,5)} hrs` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-800">{fmt(session.ventas_total || 0)}</p>
                    <p className="text-xs text-slate-400">{session.ventas_count || 0} ventas</p>
                  </div>
                </div>

                {/* Payment breakdown */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Efectivo', value: session.total_efectivo || 0, cls: 'badge-efectivo' },
                    { label: 'Tarjeta', value: session.total_tarjeta || 0, cls: 'badge-tarjeta' },
                    { label: 'Transferencia', value: session.total_transferencia || 0, cls: 'badge-transferencia' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <p className="font-bold text-slate-800 text-sm">{fmt(value)}</p>
                      <span className={`${cls} text-xs`}>{label}</span>
                    </div>
                  ))}
                </div>

                {session.status === 'open' && (
                  <button
                    onClick={() => closeSession(session.id)}
                    disabled={closingSession === session.id}
                    className="w-full btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
                  >
                    <Scissors size={15} />
                    {closingSession === session.id ? 'Cerrando...' : 'Hacer corte y cerrar caja'}
                  </button>
                )}
                {session.status === 'closed' && (
                  <div className="flex items-center gap-2 text-accent-600 text-sm font-semibold">
                    <CheckCircle size={15} /> Caja cerrada correctamente
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inventory snapshot */}
      {corte?.inventory && (
        <div>
          <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Package size={18} className="text-brand-500" /> Inventario final del día
          </h2>
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 text-xs font-bold text-slate-500 uppercase flex">
              <span className="flex-1">Producto</span>
              <span className="w-20 text-center">Stock final</span>
              <span className="w-20 text-right">Valor</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-orange-50">
              {corte.inventory.map(p => (
                <div key={p.id} className="flex items-center px-4 py-2 text-sm hover:bg-orange-50">
                  <div className="flex-1">
                    <span className="font-medium text-slate-800">{p.name}</span>
                    {p.stock === 0 && <span className="ml-2 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">Agotado</span>}
                    {p.stock > 0 && p.stock <= 5 && <span className="ml-2 bg-amber-100 text-amber-600 text-xs px-1.5 py-0.5 rounded-full flex-inline items-center gap-1"><AlertTriangle size={10} className="inline" /> Bajo</span>}
                  </div>
                  <span className="w-20 text-center font-bold text-slate-700">{p.stock} {p.unit}</span>
                  <span className="w-20 text-right text-slate-500">{fmt(p.stock * p.price)}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-orange-50 border-t border-orange-100 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600">Valor total en inventario</span>
              <span className="font-black text-brand-600">
                {fmt(corte.inventory.reduce((s, p) => s + p.stock * p.price, 0))}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Este inventario se guardará como inventario inicial del siguiente día
          </p>
        </div>
      )}
    </div>
  );
}

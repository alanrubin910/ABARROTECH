import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, ShoppingBag, Banknote, CreditCard, ArrowLeftRight, Calendar, DollarSign, Percent, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const API = '/api';
const fmt = (n) => `$${Number(n).toFixed(2)}`;
const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6'];

// Fecha local correcta (toISOString usa UTC y puede devolver el día siguiente)
function localDateStr() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

export default function Reportes() {
  const [daily, setDaily] = useState(null);
  const [history, setHistory] = useState([]);
  const [cardSales, setCardSales] = useState([]);
  const [date, setDate] = useState(() => {
    return localStorage.getItem('reportes_date') || localDateStr();
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [date]);

  async function fetchData() {
    setLoading(true);
    const [dailyRes, historyRes, cardRes] = await Promise.all([
      fetch(`${API}/reports/daily?date=${date}`),
      fetch(`${API}/reports/history`),
      fetch(`${API}/reports/card-sales?date=${date}`)
    ]);
    const [dailyData, historyData, cardData] = await Promise.all([
      dailyRes.json(), historyRes.json(), cardRes.json()
    ]);
    setDaily(dailyData);
    setHistory(historyData.daily || []);
    setCardSales(cardData.sales || []);
    setLoading(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const s = daily?.summary || {};

  const paymentPieData = [
    { name: 'Efectivo', value: s.efectivo || 0 },
    { name: 'Tarjeta', value: s.tarjeta || 0 },
    { name: 'Transferencia', value: s.transferencia || 0 },
  ].filter(d => d.value > 0);

  const hourData = (daily?.salesByHour || []).map(h => ({
    hora: `${h.hora}:00`,
    ventas: h.ventas,
    importe: parseFloat(h.importe)
  }));

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Reportes</h1>
          <p className="text-slate-500 text-sm">Análisis de ventas e inventario</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 hover:bg-orange-100 rounded-xl transition-colors" title="Recargar datos">
            <RefreshCw size={15} className="text-brand-500" />
          </button>
          <Calendar size={16} className="text-slate-400" />
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); localStorage.setItem('reportes_date', e.target.value); }}
            className="input text-sm w-auto"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Ventas totales', value: fmt(s.total_importe || 0), sub: `${s.total_ventas || 0} transacciones`, icon: TrendingUp, color: 'bg-brand-500' },
          { label: 'Efectivo', value: fmt(s.efectivo || 0), sub: 'en caja', icon: Banknote, color: 'bg-green-500' },
          { label: 'Tarjeta', value: fmt(s.tarjeta || 0), sub: 'con terminal', icon: CreditCard, color: 'bg-blue-500' },
          { label: 'Transferencia', value: fmt(s.transferencia || 0), sub: 'digitales', icon: ArrowLeftRight, color: 'bg-purple-500' },
          { label: 'Ganancia estimada', value: fmt(s.ganancia || 0), sub: 'venta − costo proveedor', icon: DollarSign, color: 'bg-emerald-500' },
          { label: 'Comisiones tarjeta', value: fmt(s.total_comisiones || 0), sub: 'cobradas al cliente', icon: Percent, color: 'bg-orange-500' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={18} className="text-white" />
            </div>
            <p className="text-xl font-black text-slate-800">{value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{label}</p>
            <p className="text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Ventas por hora */}
        <div className="card md:col-span-2">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-brand-500" /> Ventas por hora
          </h3>
          {hourData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: '1px solid #fed7aa' }} />
                <Bar dataKey="importe" fill="#f97316" radius={[6, 6, 0, 0]} name="Importe" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-300">
              <div className="text-center">
                <BarChart2 size={40} className="mx-auto mb-2" />
                <p className="text-sm">Sin ventas para esta fecha</p>
              </div>
            </div>
          )}
        </div>

        {/* Payment pie */}
        <div className="card">
          <h3 className="font-bold text-slate-700 mb-4">Forma de pago</h3>
          {paymentPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                  {paymentPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-300">
              <p className="text-sm">Sin datos</p>
            </div>
          )}
        </div>
      </div>

      {/* Top products */}
      {daily?.topProducts?.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <ShoppingBag size={16} className="text-brand-500" /> Productos más vendidos del día
          </h3>
          <div className="space-y-2">
            {daily.topProducts.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${
                  idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-sm font-semibold text-slate-800">{p.product_name}</span>
                    <span className="text-sm font-black text-brand-600">{fmt(p.total_importe)}</span>
                  </div>
                  <div className="relative h-1.5 bg-orange-100 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-brand-400 rounded-full"
                      style={{ width: `${Math.min(100, (p.total_piezas / (daily.topProducts[0]?.total_piezas || 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{p.total_piezas} piezas vendidas</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History chart (7 days) */}
      {history.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-500" /> Últimos 7 días
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={history} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: '1px solid #fed7aa' }} />
              <Bar dataKey="importe" fill="#f97316" radius={[6, 6, 0, 0]} name="Ventas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detalle ventas con tarjeta */}
      <div className="card">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
          <CreditCard size={16} className="text-blue-500" /> Ventas con tarjeta del día
        </h3>
        {cardSales.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">Sin ventas con tarjeta para esta fecha</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="pb-2 pr-3">Hora</th>
                  <th className="pb-2 pr-3">Cajero</th>
                  <th className="pb-2 pr-3">Terminal</th>
                  <th className="pb-2 pr-3 text-right">Total</th>
                  <th className="pb-2 text-right">Comisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cardSales.map(v => (
                  <tr key={v.id}>
                    <td className="py-2 pr-3 text-slate-500 font-mono text-xs">
                      {v.created_at ? v.created_at.slice(11, 16) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-slate-700">{v.cashier_name}</td>
                    <td className="py-2 pr-3">
                      {v.terminal_name
                        ? <span className="text-blue-600 font-medium">{v.terminal_name} ({v.commission_rate ?? 0}%)</span>
                        : <span className="text-slate-300 italic">sin terminal</span>}
                    </td>
                    <td className="py-2 pr-3 font-bold text-slate-800 text-right">{fmt(v.total)}</td>
                    <td className="py-2 text-right">
                      {(parseFloat(v.commission_amount) || 0) > 0
                        ? <span className="text-orange-600 font-bold">{fmt(v.commission_amount)}</span>
                        : <span className="text-slate-300">$0.00</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-orange-200 font-black">
                  <td colSpan={4} className="pt-2 text-right text-slate-600 text-xs">Total comisiones:</td>
                  <td className="pt-2 text-right text-orange-600">
                    {fmt(cardSales.reduce((s, v) => s + (parseFloat(v.commission_amount) || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

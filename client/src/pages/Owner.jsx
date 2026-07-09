import { useState, useEffect, useCallback } from 'react';
import {
  Lock, KeyRound, TrendingUp, DollarSign, Users, Receipt,
  Calculator, Settings, RefreshCw, Plus, Trash2, Edit2, X, Check,
} from 'lucide-react';

const API = '/api';

function currency(n) {
  return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function pct(part, total) {
  if (!total || Number(total) === 0) return '—';
  return ((Number(part) / Number(total)) * 100).toFixed(1) + '%';
}

// ── PIN Screen ─────────────────────────────────────────────────────────────
function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (!pin) return;
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/owner/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (r.ok) {
        sessionStorage.setItem('ownerUnlocked', '1');
        onUnlock();
      } else {
        setError('PIN incorrecto. Inténtalo de nuevo.');
        setPin('');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-xs text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="text-brand-600" size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Panel del Dueño</h2>
        <p className="text-sm text-slate-500 mb-6">Ingresa tu PIN de acceso</p>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && verify()}
          placeholder="• • • •"
          className="input text-center text-2xl tracking-widest mb-3 w-full"
          autoFocus
        />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button onClick={verify} disabled={loading || !pin} className="btn-primary w-full">
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
        <p className="text-xs text-slate-400 mt-4">PIN por defecto: 1234</p>
      </div>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'slate' }) {
  const colors = {
    slate:  'bg-slate-50  border-slate-200  text-slate-700',
    green:  'bg-green-50  border-green-200  text-green-700',
    red:    'bg-red-50    border-red-200    text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    blue:   'bg-blue-50   border-blue-200   text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

// ── Resumen Tab ────────────────────────────────────────────────────────────
function ResumenTab({ from, to }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/owner/summary?from=${from}&to=${to}`);
      setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-center text-sm text-slate-400 py-12">Cargando...</p>;
  if (!data) return null;

  const isPositive = Number(data.utilidad_neta) >= 0;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={load} className="btn-secondary text-xs flex items-center gap-1">
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Ventas realizadas"   value={data.total_ventas}                   color="blue"   />
        <KpiCard label="Ingresos totales"    value={currency(data.ingresos)}             color="blue"   />
        <KpiCard label="Costo de mercancía"  value={currency(data.costo_mercancia)}      color="orange" />
        <KpiCard label="Ganancia bruta"      value={currency(data.ganancia_bruta)}
                 sub={pct(data.ganancia_bruta, data.ingresos) + ' del ingreso'}          color="green"  />
        <KpiCard label="Gastos operativos"   value={currency(data.total_gastos)}         color="orange" />
        <KpiCard label="Nómina pagada"       value={currency(data.total_nomina)}         color="purple" />
        <KpiCard label="Comisiones tarjeta"  value={currency(data.total_comisiones)}     color="slate"  />
      </div>

      <div className={`rounded-2xl border-2 p-6 text-center ${isPositive ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Utilidad Neta del Período</p>
        <p className={`text-4xl font-black ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
          {currency(data.utilidad_neta)}
        </p>
        <p className="text-xs text-slate-400 mt-2">{data.from} → {data.to}</p>
        <p className="text-xs text-slate-500 mt-1">
          = Ganancia bruta {currency(data.ganancia_bruta)} − Gastos {currency(data.total_gastos)} − Nómina {currency(data.total_nomina)} − Comisiones {currency(data.total_comisiones)}
        </p>
      </div>
    </div>
  );
}

// ── Ganancias Tab ──────────────────────────────────────────────────────────
function GananciasTab({ from, to }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/owner/daily-profit?from=${from}&to=${to}`);
      const d = await r.json();
      setRows(Array.isArray(d) ? d : []);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const totIngresos = rows.reduce((s, r) => s + Number(r.ingresos || 0), 0);
  const totCosto    = rows.reduce((s, r) => s + Number(r.costo    || 0), 0);
  const totGanancia = rows.reduce((s, r) => s + Number(r.ganancia || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-700 text-sm">Ganancia diaria (precio venta − costo)</h3>
        <button onClick={load} className="btn-secondary text-xs flex items-center gap-1">
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-slate-400 py-10">Cargando...</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin ventas en este período</p>
          <p className="text-xs mt-1">Asegúrate de que los productos tengan precio de costo registrado en la pestaña Costeo</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-xs text-slate-500 uppercase">
                <th className="text-left pb-2 pr-3">Fecha</th>
                <th className="text-right pb-2 pr-3">Ingresos</th>
                <th className="text-right pb-2 pr-3">Costo mercancía</th>
                <th className="text-right pb-2 pr-3">Ganancia</th>
                <th className="text-right pb-2">Margen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const gan = Number(r.ganancia || 0);
                return (
                  <tr key={r.fecha} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-3 font-mono text-xs text-slate-600">{r.fecha}</td>
                    <td className="text-right py-2 pr-3">{currency(r.ingresos)}</td>
                    <td className="text-right py-2 pr-3 text-orange-600">{currency(r.costo)}</td>
                    <td className={`text-right py-2 pr-3 font-semibold ${gan >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {currency(gan)}
                    </td>
                    <td className="text-right py-2 text-slate-500 text-xs">{pct(r.ganancia, r.ingresos)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-bold text-sm">
                <td className="py-2 pr-3">TOTAL</td>
                <td className="text-right py-2 pr-3">{currency(totIngresos)}</td>
                <td className="text-right py-2 pr-3 text-orange-700">{currency(totCosto)}</td>
                <td className={`text-right py-2 pr-3 ${totGanancia >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {currency(totGanancia)}
                </td>
                <td className="text-right py-2 text-slate-500 text-xs">{pct(totGanancia, totIngresos)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Nómina Tab ─────────────────────────────────────────────────────────────
const EMPTY_EMP = { name: '', position: '', salary_type: 'weekly', base_salary: '' };
const SALARY_LABELS = { daily: 'Diario', weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };
const EMPTY_PAY = { period_start: '', period_end: '', days_worked: '', amount_paid: '', notes: '' };

function NominaTab() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm]     = useState(EMPTY_EMP);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [payEmp, setPayEmp]     = useState(null);
  const [payForm, setPayForm]   = useState(EMPTY_PAY);
  const [payHistory, setPayHistory] = useState([]);

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    const r = await fetch(`${API}/employees`);
    const d = await r.json();
    setEmployees(Array.isArray(d) ? d : []);
  }

  async function saveEmployee() {
    if (!form.name.trim()) { setError('Nombre requerido'); return; }
    setSaving(true); setError('');
    const url    = editId ? `${API}/employees/${editId}` : `${API}/employees`;
    const method = editId ? 'PUT' : 'POST';
    const r = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setSaving(false);
    if (!r.ok) { const d = await r.json(); setError(d.error || 'Error'); return; }
    setForm(EMPTY_EMP); setEditId(null);
    loadEmployees();
  }

  async function deleteEmployee(id) {
    await fetch(`${API}/employees/${id}`, { method: 'DELETE' });
    loadEmployees();
  }

  async function openPay(emp) {
    setPayEmp(emp);
    setPayForm({ ...EMPTY_PAY, amount_paid: String(emp.base_salary || '') });
    const r = await fetch(`${API}/employees/${emp.id}/payroll`);
    const d = await r.json();
    setPayHistory(Array.isArray(d) ? d : []);
  }

  async function registerPayment() {
    if (!payForm.amount_paid) return;
    const r = await fetch(`${API}/employees/${payEmp.id}/payroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payForm),
    });
    if (r.ok) {
      const updated = await fetch(`${API}/employees/${payEmp.id}/payroll`);
      const d = await updated.json();
      setPayHistory(Array.isArray(d) ? d : []);
      setPayForm(EMPTY_PAY);
    }
  }

  const totalPagado = payHistory.reduce((s, p) => s + Number(p.amount_paid || 0), 0);

  return (
    <div className="space-y-5">
      {/* Form */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="label mb-3">{editId ? 'Editar empleado' : 'Agregar empleado'}</p>
        {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nombre *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="input text-sm" placeholder="Nombre completo" />
          </div>
          <div>
            <label className="label">Puesto</label>
            <input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}
              className="input text-sm" placeholder="Cajero, Encargado..." />
          </div>
          <div>
            <label className="label">Tipo de sueldo</label>
            <select value={form.salary_type} onChange={e => setForm({ ...form, salary_type: e.target.value })} className="input text-sm">
              {Object.entries(SALARY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sueldo base ($)</label>
            <input type="number" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })}
              className="input text-sm" placeholder="0.00" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {editId && (
            <button onClick={() => { setEditId(null); setForm(EMPTY_EMP); setError(''); }}
              className="btn-secondary text-sm flex-1">Cancelar</button>
          )}
          <button onClick={saveEmployee} disabled={saving} className="btn-primary text-sm flex-1 flex items-center justify-center gap-2">
            <Plus size={14} /> {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Agregar empleado'}
          </button>
        </div>
      </div>

      {/* Employee list */}
      {employees.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-6">Sin empleados registrados</p>
      ) : (
        <div className="space-y-2">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-brand-700 font-bold">{emp.name[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{emp.name}</p>
                <p className="text-xs text-slate-500">
                  {emp.position || 'Sin puesto'} · {SALARY_LABELS[emp.salary_type]} {currency(emp.base_salary)}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openPay(emp)} className="btn-primary text-xs px-3 py-1.5">Pagar</button>
                <button onClick={() => {
                  setEditId(emp.id);
                  setForm({ name: emp.name, position: emp.position || '', salary_type: emp.salary_type, base_salary: String(emp.base_salary) });
                }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => deleteEmployee(emp.id)} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pay modal */}
      {payEmp && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <p className="font-bold text-slate-800">Pagar a {payEmp.name}</p>
                <p className="text-xs text-slate-500">
                  {SALARY_LABELS[payEmp.salary_type]} · Base: {currency(payEmp.base_salary)}
                </p>
              </div>
              <button onClick={() => setPayEmp(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Período inicio</label>
                  <input type="date" value={payForm.period_start}
                    onChange={e => setPayForm({ ...payForm, period_start: e.target.value })} className="input text-sm" />
                </div>
                <div>
                  <label className="label">Período fin</label>
                  <input type="date" value={payForm.period_end}
                    onChange={e => setPayForm({ ...payForm, period_end: e.target.value })} className="input text-sm" />
                </div>
                <div>
                  <label className="label">Días trabajados</label>
                  <input type="number" value={payForm.days_worked}
                    onChange={e => setPayForm({ ...payForm, days_worked: e.target.value })}
                    className="input text-sm" placeholder="0" min="0" max="31" />
                </div>
                <div>
                  <label className="label">Monto a pagar *</label>
                  <input type="number" value={payForm.amount_paid}
                    onChange={e => setPayForm({ ...payForm, amount_paid: e.target.value })}
                    className="input text-sm font-bold" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="label">Notas</label>
                <input value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                  className="input text-sm" placeholder="Ej: Semana del 1 al 7" />
              </div>
              <button onClick={registerPayment} className="btn-primary w-full text-sm">
                Registrar pago
              </button>
            </div>

            {payHistory.length > 0 && (
              <div className="border-t p-5">
                <div className="flex justify-between items-center mb-2">
                  <p className="label">Historial de pagos</p>
                  <span className="text-xs font-bold text-green-700">Total: {currency(totalPagado)}</span>
                </div>
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {payHistory.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 gap-2">
                      <span className="text-slate-400 font-mono">{(p.paid_at || '').slice(0, 10)}</span>
                      <span className="font-bold text-green-700">{currency(p.amount_paid)}</span>
                      <span className="text-slate-400 truncate flex-1 text-right">{p.notes || (p.days_worked ? `${p.days_worked}d` : '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Gastos Tab ─────────────────────────────────────────────────────────────
const CATS = ['Renta', 'Servicios', 'Proveedores', 'Transporte', 'Limpieza', 'Mantenimiento', 'Otros'];
const EMPTY_EXP = { category: 'Otros', description: '', amount: '', expense_date: '', notes: '' };

function GastosTab({ from, to }) {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm]     = useState({ ...EMPTY_EXP });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const load = useCallback(async () => {
    const r = await fetch(`${API}/expenses?from=${from}&to=${to}`);
    const d = await r.json();
    setExpenses(Array.isArray(d) ? d : []);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.amount || !form.category) { setError('Categoría y monto requeridos'); return; }
    setSaving(true); setError('');
    const url    = editId ? `${API}/expenses/${editId}` : `${API}/expenses`;
    const method = editId ? 'PUT' : 'POST';
    const r = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setSaving(false);
    if (!r.ok) { const d = await r.json(); setError(d.error || 'Error'); return; }
    setForm({ ...EMPTY_EXP }); setEditId(null);
    load();
  }

  async function deleteExpense(id) {
    await fetch(`${API}/expenses/${id}`, { method: 'DELETE' });
    load();
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="label mb-3">{editId ? 'Editar gasto' : 'Registrar gasto'}</p>
        {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoría *</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input text-sm">
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Monto *</label>
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
              className="input text-sm" placeholder="0.00" />
          </div>
          <div>
            <label className="label">Descripción</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="input text-sm" placeholder="Ej: Pago de luz de julio" />
          </div>
          <div>
            <label className="label">Fecha</label>
            <input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })}
              className="input text-sm" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {editId && (
            <button onClick={() => { setEditId(null); setForm({ ...EMPTY_EXP }); }}
              className="btn-secondary text-sm flex-1">Cancelar</button>
          )}
          <button onClick={save} disabled={saving} className="btn-primary text-sm flex-1 flex items-center justify-center gap-2">
            <Plus size={14} /> {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Agregar gasto'}
          </button>
        </div>
      </div>

      {/* Category summary */}
      {Object.keys(byCategory).length > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-100 p-3">
          <div className="flex flex-wrap gap-2 mb-2">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <span key={cat} className="text-xs bg-white border border-orange-200 px-2 py-1 rounded-full">
                {cat}: <strong>{currency(amt)}</strong>
              </span>
            ))}
          </div>
          <p className="text-sm font-bold text-orange-800">Total gastos: {currency(total)}</p>
        </div>
      )}

      {/* Expenses list */}
      {expenses.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-6">Sin gastos en este período</p>
      ) : (
        <div className="space-y-2">
          {expenses.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                    {e.category}
                  </span>
                  {e.description && <span className="text-sm font-medium text-slate-700 truncate">{e.description}</span>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{e.expense_date}{e.notes ? ` · ${e.notes}` : ''}</p>
              </div>
              <span className="font-bold text-red-700 text-sm flex-shrink-0">{currency(e.amount)}</span>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => {
                  setEditId(e.id);
                  setForm({ category: e.category, description: e.description || '', amount: String(e.amount), expense_date: e.expense_date || '', notes: e.notes || '' });
                }} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
                  <Edit2 size={12} />
                </button>
                <button onClick={() => deleteExpense(e.id)} className="p-1 hover:bg-red-100 text-red-500 rounded-lg">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Costeo Tab ─────────────────────────────────────────────────────────────
function CosteoTab() {
  const [products, setProducts] = useState([]);
  const [search, setSearch]     = useState('');
  const [editCost, setEditCost] = useState({});
  const [saving, setSaving]     = useState({});

  useEffect(() => {
    fetch(`${API}/products`)
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d.filter(p => p.active !== 0) : []));
  }, []);

  async function saveCost(product) {
    const newCost = parseFloat(editCost[product.id]);
    if (isNaN(newCost) || newCost < 0) return;
    setSaving(p => ({ ...p, [product.id]: true }));
    await fetch(`${API}/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...product, cost_price: newCost }),
    });
    setSaving(p => ({ ...p, [product.id]: false }));
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, cost_price: newCost } : p));
    setEditCost(prev => { const n = { ...prev }; delete n[product.id]; return n; });
  }

  const filtered = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode || '').includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
        <strong>Costeo de productos:</strong> Haz clic en el precio de costo para editarlo. El margen se calcula automáticamente respecto al precio de venta. Esto alimenta el reporte de Ganancias.
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)}
        className="input text-sm w-full" placeholder="Buscar producto por nombre o código..." />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-xs text-slate-500 uppercase">
              <th className="text-left pb-2 pr-2">Producto</th>
              <th className="text-right pb-2 pr-2">Precio venta</th>
              <th className="text-right pb-2 pr-2">Costo (clic para editar)</th>
              <th className="text-right pb-2 pr-2">Ganancia $</th>
              <th className="text-right pb-2">Margen %</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const cost   = editCost[p.id] !== undefined ? (parseFloat(editCost[p.id]) || 0) : Number(p.cost_price || 0);
              const margin = Number(p.price) - cost;
              const marginPct = Number(p.price) > 0 ? (margin / Number(p.price)) * 100 : 0;
              const isEditing = editCost[p.id] !== undefined;
              const marginColor = marginPct >= 20 ? 'text-green-700' : marginPct >= 10 ? 'text-amber-600' : 'text-red-600';

              return (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-2">
                    <p className="font-medium text-slate-800 text-xs leading-tight">{p.name}</p>
                    <p className="text-slate-400 text-[10px]">{p.category}</p>
                  </td>
                  <td className="text-right py-2 pr-2 font-mono text-xs">{currency(p.price)}</td>
                  <td className="text-right py-2 pr-2">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <input type="number" min="0" step="0.01"
                          value={editCost[p.id]}
                          onChange={e => setEditCost(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') saveCost(p); if (e.key === 'Escape') setEditCost(prev => { const n = { ...prev }; delete n[p.id]; return n; }); }}
                          className="input text-xs text-right w-24 py-1" autoFocus />
                        <button onClick={() => saveCost(p)} disabled={saving[p.id]}
                          className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                          <Check size={11} />
                        </button>
                        <button onClick={() => setEditCost(prev => { const n = { ...prev }; delete n[p.id]; return n; })}
                          className="p-1 bg-slate-100 rounded hover:bg-slate-200">
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditCost(prev => ({ ...prev, [p.id]: String(p.cost_price || 0) }))}
                        className="font-mono text-xs hover:text-brand-600 hover:underline transition-colors w-full text-right">
                        {currency(p.cost_price || 0)}
                      </button>
                    )}
                  </td>
                  <td className={`text-right py-2 pr-2 font-semibold text-xs ${margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {currency(margin)}
                  </td>
                  <td className={`text-right py-2 text-xs font-bold ${marginColor}`}>
                    {Number(p.price) > 0 ? marginPct.toFixed(1) + '%' : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Config Tab ─────────────────────────────────────────────────────────────
function ConfigTab({ onLock }) {
  const [form, setForm] = useState({ current_pin: '', new_pin: '', confirm_pin: '' });
  const [msg, setMsg]   = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function changePin() {
    if (!form.current_pin || !form.new_pin) { setError('Completa todos los campos'); return; }
    if (form.new_pin !== form.confirm_pin)  { setError('Los PINs nuevos no coinciden'); return; }
    if (form.new_pin.length < 4)            { setError('El PIN debe tener al menos 4 dígitos'); return; }
    setSaving(true); setError(''); setMsg('');
    const r = await fetch(`${API}/owner/change-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_pin: form.current_pin, new_pin: form.new_pin }),
    });
    setSaving(false);
    if (r.ok) {
      setMsg('PIN actualizado correctamente');
      setForm({ current_pin: '', new_pin: '', confirm_pin: '' });
    } else {
      const d = await r.json();
      setError(d.error || 'Error al cambiar PIN');
    }
  }

  return (
    <div className="space-y-4 max-w-sm">
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="label mb-3">Cambiar PIN de acceso</p>
        {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
        {msg   && <p className="text-green-600 text-xs mb-2">{msg}</p>}
        <div className="space-y-3">
          <div>
            <label className="label">PIN actual</label>
            <input type="password" inputMode="numeric" value={form.current_pin}
              onChange={e => setForm({ ...form, current_pin: e.target.value.replace(/\D/g, '') })}
              className="input text-sm" placeholder="••••" />
          </div>
          <div>
            <label className="label">Nuevo PIN</label>
            <input type="password" inputMode="numeric" value={form.new_pin}
              onChange={e => setForm({ ...form, new_pin: e.target.value.replace(/\D/g, '') })}
              className="input text-sm" placeholder="••••" />
          </div>
          <div>
            <label className="label">Confirmar nuevo PIN</label>
            <input type="password" inputMode="numeric" value={form.confirm_pin}
              onChange={e => setForm({ ...form, confirm_pin: e.target.value.replace(/\D/g, '') })}
              className="input text-sm" placeholder="••••" />
          </div>
        </div>
        <button onClick={changePin} disabled={saving} className="btn-primary w-full text-sm mt-4">
          {saving ? 'Guardando...' : 'Cambiar PIN'}
        </button>
      </div>

      <button onClick={() => { sessionStorage.removeItem('ownerUnlocked'); onLock(); }}
        className="w-full py-2 px-4 rounded-xl border-2 border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 flex items-center justify-center gap-2 transition-colors">
        <Lock size={14} /> Cerrar sesión del dueño
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'resumen',  label: 'Resumen',   icon: TrendingUp  },
  { id: 'ganancias',label: 'Ganancias', icon: DollarSign  },
  { id: 'nomina',   label: 'Nómina',    icon: Users       },
  { id: 'gastos',   label: 'Gastos',    icon: Receipt     },
  { id: 'costeo',   label: 'Costeo',    icon: Calculator  },
  { id: 'config',   label: 'Config',    icon: Settings    },
];

const DATE_TABS = ['resumen', 'ganancias', 'gastos'];

export default function Owner() {
  const today        = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.slice(0, 7) + '-01';

  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('ownerUnlocked') === '1');
  const [tab, setTab] = useState('resumen');
  const [from, setFrom] = useState(firstOfMonth);
  const [to,   setTo  ] = useState(today);

  function prevMonth() {
    const d = new Date(from);
    d.setDate(1); d.setMonth(d.getMonth() - 1);
    const f = d.toISOString().split('T')[0];
    const t = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    setFrom(f); setTo(t);
  }

  if (!unlocked) return <PinScreen onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <KeyRound className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800">Panel del Dueño</h1>
          <p className="text-slate-500 text-xs">Administración financiera completa</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              tab === id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Date range bar (shared for resumen/ganancias/gastos) */}
      {DATE_TABS.includes(tab) && (
        <div className="flex flex-wrap gap-3 items-end mb-4 bg-white border border-slate-200 rounded-xl p-3">
          <div>
            <label className="label">Desde</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input text-sm" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { setFrom(firstOfMonth); setTo(today); }} className="btn-secondary text-xs">
              Este mes
            </button>
            <button onClick={prevMonth} className="btn-secondary text-xs">
              Mes anterior
            </button>
            <button onClick={() => {
              const w = new Date(); w.setDate(w.getDate() - 6);
              setFrom(w.toISOString().split('T')[0]); setTo(today);
            }} className="btn-secondary text-xs">
              Últimos 7 días
            </button>
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
        {tab === 'resumen'   && <ResumenTab  from={from} to={to} />}
        {tab === 'ganancias' && <GananciasTab from={from} to={to} />}
        {tab === 'nomina'    && <NominaTab />}
        {tab === 'gastos'    && <GastosTab from={from} to={to} />}
        {tab === 'costeo'    && <CosteoTab />}
        {tab === 'config'    && <ConfigTab onLock={() => setUnlocked(false)} />}
      </div>
    </div>
  );
}

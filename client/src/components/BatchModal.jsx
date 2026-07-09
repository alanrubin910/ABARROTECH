import { useState, useEffect } from 'react';
import { Plus, Trash2, Package, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const API = '/api';

function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr + 'T00:00:00');
  return Math.round((expiry - today) / 86400000);
}

function ExpiryBadge({ expiry_date }) {
  if (!expiry_date) return (
    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Sin fecha</span>
  );
  const days = daysUntilExpiry(expiry_date);
  if (days < 0) return (
    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
      <AlertTriangle size={10} /> Caducado hace {Math.abs(days)}d
    </span>
  );
  if (days === 0) return (
    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
      <AlertTriangle size={10} /> Caduca HOY
    </span>
  );
  if (days <= 7) return (
    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
      <Clock size={10} /> Caduca en {days}d
    </span>
  );
  if (days <= 30) return (
    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
      <Clock size={10} /> {days}d restantes
    </span>
  );
  return (
    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
      <CheckCircle size={10} /> Vigente · {days}d
    </span>
  );
}

const EMPTY = { expiry_date: '', quantity: '' };

export default function BatchModal({ product, onClose }) {
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchBatches(); }, []);

  async function fetchBatches() {
    const r = await fetch(`${API}/batches?product_id=${product.id}`);
    const data = await r.json();
    setBatches(Array.isArray(data) ? data : []);
  }

  async function save() {
    if (!form.quantity) { setError('La cantidad es requerida'); return; }
    setSaving(true); setError('');
    const body = {
      product_id: product.id,
      expiry_date: form.expiry_date || null,
      quantity: parseInt(form.quantity) || 0,
    };
    const url = editId ? `${API}/batches/${editId}` : `${API}/batches`;
    const method = editId ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (!r.ok) { const d = await r.json(); setError(d.error || 'Error al guardar'); return; }
    setForm(EMPTY); setEditId(null);
    fetchBatches();
  }

  function startEdit(batch) {
    setEditId(batch.id);
    setForm({
      expiry_date: batch.expiry_date || '',
      quantity: String(batch.quantity),
    });
    setError('');
  }

  async function deleteBatch(id) {
    if (!confirm('¿Eliminar este lote?')) return;
    await fetch(`${API}/batches/${id}`, { method: 'DELETE' });
    fetchBatches();
  }

  const totalBatchQty = batches.reduce((s, b) => s + b.quantity, 0);
  const expiredCount = batches.filter(b => b.expiry_date && daysUntilExpiry(b.expiry_date) < 0).length;
  const soonCount = batches.filter(b => { const d = daysUntilExpiry(b.expiry_date); return d !== null && d >= 0 && d <= 7; }).length;

  return (
    <div className="space-y-4">
      {/* Cabecera producto */}
      <div className="bg-orange-50 rounded-xl px-4 py-3 border border-orange-100">
        <p className="font-bold text-slate-800">{product.name}</p>
        <div className="flex gap-3 mt-1 text-xs text-slate-500">
          <span>Stock total: <strong className="text-slate-700">{product.stock}</strong></span>
          <span>Registros: <strong className="text-slate-700">{totalBatchQty}</strong></span>
          {expiredCount > 0 && <span className="text-red-600 font-bold">{expiredCount} caducado(s)</span>}
          {soonCount > 0 && <span className="text-orange-600 font-bold">{soonCount} vence pronto</span>}
        </div>
      </div>

      {/* Lista de lotes */}
      {batches.length === 0 ? (
        <div className="text-center py-6 text-slate-400">
          <Package size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Sin caducidades registradas</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {batches.map(b => {
            const days = daysUntilExpiry(b.expiry_date);
            const isExpired = days !== null && days < 0;
            return (
              <div key={b.id} className={`flex items-start gap-3 p-3 rounded-xl border ${isExpired ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ExpiryBadge expiry_date={b.expiry_date} />
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-slate-600">
                    <span>Cant: <strong>{b.quantity}</strong></span>
                    {b.expiry_date && <span>Vence: <strong>{b.expiry_date}</strong></span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(b)} className="p-1.5 hover:bg-brand-100 text-brand-600 rounded-lg text-xs font-semibold">
                    Editar
                  </button>
                  <button onClick={() => deleteBatch(b.id)} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulario agregar / editar lote */}
      <div className="border-t pt-4">
        <p className="label mb-3">{editId ? 'Editar caducidad' : 'Agregar caducidad'}</p>
        {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fecha de caducidad</label>
            <input value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })}
              type="date" className="input text-sm" />
          </div>
          <div>
            <label className="label">Cantidad *</label>
            <input value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
              type="number" min="0" className="input text-sm" placeholder="0" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {editId && (
            <button onClick={() => { setEditId(null); setForm(EMPTY); setError(''); }}
              className="btn-secondary flex-1 text-sm">Cancelar edición</button>
          )}
          <button onClick={save} disabled={saving} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
            <Plus size={15} /> {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Agregar caducidad'}
          </button>
        </div>
      </div>

      <button onClick={onClose} className="btn-secondary w-full text-sm">Cerrar</button>
    </div>
  );
}

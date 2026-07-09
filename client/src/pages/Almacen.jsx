import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, AlertTriangle, Search, Camera, Layers, Clock } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import CameraScanner from '../components/CameraScanner.jsx';
import BatchModal from '../components/BatchModal.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';

const API = '/api';
const fmt = (n) => `$${Number(n).toFixed(2)}`;

const UNITS = ['pieza', 'kg', 'litro', 'caja', 'bolsa', 'docena', 'par'];
const CATEGORIES = ['General', 'Bebidas', 'Lácteos', 'Panadería', 'Botanas', 'Dulces', 'Limpieza', 'Higiene personal', 'Frutas y Verduras', 'Carnes', 'Enlatados', 'Abarrotes'];

const EMPTY_FORM = { name: '', price: '', cost_price: '', barcode: '', stock: '', min_stock: '5', unit: 'pieza', category: 'General' };

function StockBadge({ product }) {
  if (product.stock === 0) return <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">Agotado</span>;
  if (product.stock <= product.min_stock) return (
    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
      <AlertTriangle size={10} /> Bajo
    </span>
  );
  return <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">OK</span>;
}

export default function Almacen() {
  const isMobile = useIsMobile();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [batchProduct, setBatchProduct] = useState(null); // producto con modal de lotes abierto
  const [expiringBatches, setExpiringBatches] = useState([]);

  useEffect(() => { fetchProducts(); fetchExpiringBatches(); }, []);

  async function fetchProducts() {
    const r = await fetch(`${API}/products?active=all`);
    const data = await r.json();
    setProducts(Array.isArray(data) ? data : []);
  }

  async function fetchExpiringBatches() {
    const r = await fetch(`${API}/batches/expiring?days=30`);
    const data = await r.json();
    setExpiringBatches(Array.isArray(data) ? data : []);
  }

  function openNew() {
    setEditProduct(null); setForm(EMPTY_FORM); setError(''); setShowModal(true);
  }

  function openEdit(product) {
    setEditProduct(product);
    setForm({
      name: product.name, price: String(product.price),
      cost_price: product.cost_price ? String(product.cost_price) : '',
      barcode: product.barcode || '', stock: String(product.stock),
      min_stock: String(product.min_stock), unit: product.unit, category: product.category
    });
    setError(''); setShowModal(true);
  }

  async function save() {
    if (!form.name.trim() || !form.price) { setError('Nombre y precio son requeridos'); return; }
    setSaving(true); setError('');
    const body = {
      name: form.name.trim(), price: parseFloat(form.price),
      cost_price: parseFloat(form.cost_price) || 0,
      barcode: form.barcode.trim() || null, stock: parseInt(form.stock) || 0,
      min_stock: parseInt(form.min_stock) || 5, unit: form.unit, category: form.category
    };
    const url = editProduct ? `${API}/products/${editProduct.id}` : `${API}/products`;
    const r = await fetch(url, { method: editProduct ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json();
    setSaving(false);
    if (!r.ok) { setError(data.error || 'Error al guardar'); return; }
    setShowModal(false); fetchProducts();
  }

  async function deleteProduct(id) {
    if (!confirm('¿Desactivar este producto?')) return;
    await fetch(`${API}/products/${id}`, { method: 'DELETE' });
    fetchProducts();
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    const matchCat = filterCat === 'Todas' || p.category === filterCat;
    const st = p.stock === 0 ? 'agotado' : p.stock <= p.min_stock ? 'bajo' : 'ok';
    const matchStatus = filterStatus === 'Todos' || st === filterStatus;
    return matchSearch && matchCat && matchStatus && p.active;
  });

  const stats = {
    total: products.filter(p => p.active).length,
    agotados: products.filter(p => p.active && p.stock === 0).length,
    bajos: products.filter(p => p.active && p.stock > 0 && p.stock <= p.min_stock).length,
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800">Almacén</h1>
          <p className="text-slate-500 text-xs md:text-sm">Catálogo de productos</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm py-2 px-3 md:px-4">
          <Plus size={15} /> <span className="hidden sm:inline">Agregar producto</span><span className="sm:hidden">Agregar</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-brand-500', text: 'text-brand-500' },
          { label: 'Agotados', value: stats.agotados, color: 'bg-red-500', text: 'text-red-500' },
          { label: 'Stock bajo', value: stats.bajos, color: 'bg-amber-500', text: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-2 md:gap-4 p-3 md:p-4">
            <div className={`w-2 md:w-3 h-8 md:h-10 rounded-full flex-shrink-0 ${s.color}`} />
            <div>
              <p className={`text-xl md:text-2xl font-black ${s.text}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas de caducidad */}
      {expiringBatches.length > 0 && (
        <div className="space-y-1.5">
          {expiringBatches.filter(b => {
            const today = new Date(); today.setHours(0,0,0,0);
            return new Date(b.expiry_date + 'T00:00:00') < today;
          }).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span className="font-semibold">Lotes caducados: </span>
              <span className="truncate">{expiringBatches.filter(b => new Date(b.expiry_date+'T00:00:00') < new Date()).map(b => b.product_name).join(', ')}</span>
            </div>
          )}
          {expiringBatches.filter(b => {
            const days = Math.round((new Date(b.expiry_date+'T00:00:00') - new Date()) / 86400000);
            return days >= 0 && days <= 7;
          }).length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-orange-700">
              <Clock size={16} className="flex-shrink-0" />
              <span className="font-semibold">Vencen en 7 días: </span>
              <span className="truncate">{expiringBatches.filter(b => { const d = Math.round((new Date(b.expiry_date+'T00:00:00') - new Date()) / 86400000); return d >= 0 && d <= 7; }).map(b => b.product_name).join(', ')}</span>
            </div>
          )}
          {expiringBatches.filter(b => {
            const days = Math.round((new Date(b.expiry_date+'T00:00:00') - new Date()) / 86400000);
            return days > 7 && days <= 30;
          }).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-amber-700">
              <Clock size={16} className="flex-shrink-0" />
              <span className="font-semibold">Vencen en 30 días: </span>
              <span className="truncate">{expiringBatches.filter(b => { const d = Math.round((new Date(b.expiry_date+'T00:00:00') - new Date()) / 86400000); return d > 7 && d <= 30; }).map(b => b.product_name).join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="input pl-8 text-sm" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input text-sm w-auto flex-shrink-0">
          <option>Todas</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input text-sm w-auto flex-shrink-0">
          <option>Todos</option>
          <option value="ok">OK</option>
          <option value="bajo">Bajo</option>
          <option value="agotado">Agotado</option>
        </select>
      </div>

      {/* Mobile: cards / Desktop: tabla — controlado por JS */}
      {isMobile && <div className="space-y-2">
        {filtered.map(product => (
          <div key={product.id} className="card flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-slate-800 truncate">{product.name}</p>
                <StockBadge product={product} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{product.barcode || '—'}</span>
                <span>{product.category}</span>
                <span className="font-bold text-slate-600">Stock: {product.stock}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black text-brand-600 text-base">{fmt(product.price)}</p>
              {product.cost_price > 0 && (
                <p className="text-xs text-green-600 font-semibold">+{fmt(product.price - product.cost_price)}</p>
              )}
              <div className="flex gap-1 mt-1 justify-end">
                <button onClick={() => setBatchProduct(product)} className="p-1.5 hover:bg-purple-100 text-purple-600 rounded-lg" title="Lotes">
                  <Layers size={13} />
                </button>
                <button onClick={() => openEdit(product)} className="p-1.5 hover:bg-brand-100 text-brand-600 rounded-lg">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => deleteProduct(product.id)} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card text-center py-10 text-slate-400">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay productos</p>
          </div>
        )}
      </div>}

      {/* Desktop: tabla — controlado por JS */}
      {!isMobile && <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-orange-50 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Margen</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-50">
              {filtered.map(product => (
                <tr key={product.id} className="hover:bg-orange-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.unit}</p>
                  </td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{product.barcode || '—'}</span></td>
                  <td className="px-4 py-3 text-slate-600">{product.category}</td>
                  <td className="px-4 py-3 text-right font-black text-brand-600">{fmt(product.price)}</td>
                  <td className="px-4 py-3 text-right">
                    {product.cost_price > 0 ? (
                      <span className="text-green-600 font-bold text-sm">+{fmt(product.price - product.cost_price)}</span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700">{product.stock}</td>
                  <td className="px-4 py-3 text-center"><StockBadge product={product} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setBatchProduct(product)} className="p-1.5 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors" title="Lotes y caducidades"><Layers size={14} /></button>
                      <button onClick={() => openEdit(product)} className="p-1.5 hover:bg-brand-100 text-brand-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => deleteProduct(product.id)} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400"><Package size={32} className="mx-auto mb-2 opacity-30" /><p>No hay productos</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Modal producto — el escáner se muestra DENTRO para evitar modal doble */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setShowScanner(false); }} title={showScanner ? 'Escanear código de barras' : (editProduct ? 'Editar producto' : 'Nuevo producto')} size="md">
        {/* Vista: escáner inline */}
        {showScanner ? (
          <CameraScanner
            onScan={(code) => { setForm(f => ({ ...f, barcode: code })); setShowScanner(false); }}
            onClose={() => setShowScanner(false)}
          />
        ) : (

        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="col-span-2">
              <label className="label">Nombre *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input" placeholder="Ej: Coca-Cola 355ml" />
            </div>
            <div>
              <label className="label">Precio de venta *</label>
              <input value={form.price} onChange={e => setForm({...form, price: e.target.value})} type="number" step="0.01" className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="label">Precio de costo <span className="text-slate-400 font-normal text-xs">(proveedor)</span></label>
              <input value={form.cost_price} onChange={e => setForm({...form, cost_price: e.target.value})} type="number" step="0.01" className="input" placeholder="0.00" />
              {form.price && form.cost_price && parseFloat(form.price) > 0 && (
                <p className="text-xs text-green-600 font-semibold mt-1">
                  Ganancia: ${(parseFloat(form.price) - parseFloat(form.cost_price || 0)).toFixed(2)} por {form.unit || 'pieza'}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <label className="label">Código de barras</label>
              <div className="flex gap-2">
                <input value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="input font-mono text-sm flex-1" placeholder="Escanea o escribe" />
                <button type="button" onClick={() => setShowScanner(true)} className="btn-secondary px-3 flex-shrink-0" title="Escanear con cámara">
                  <Camera size={16} />
                </button>
              </div>
            </div>
            <div>
              <label className="label">Stock actual</label>
              <input value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} type="number" className="input" placeholder="0" />
            </div>
            <div>
              <label className="label">Stock mínimo</label>
              <input value={form.min_stock} onChange={e => setForm({...form, min_stock: e.target.value})} type="number" className="input" placeholder="5" />
            </div>
            <div>
              <label className="label">Unidad</label>
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="input">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Categoría</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : editProduct ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </div>
        )} {/* fin else (formulario) */}
      </Modal>

      {/* Modal lotes / caducidades */}
      {batchProduct && (
        <Modal open={!!batchProduct} onClose={() => { setBatchProduct(null); fetchExpiringBatches(); }} title={`Lotes — ${batchProduct.name}`} size="md">
          <BatchModal product={batchProduct} onClose={() => { setBatchProduct(null); fetchExpiringBatches(); }} />
        </Modal>
      )}
    </div>
  );
}

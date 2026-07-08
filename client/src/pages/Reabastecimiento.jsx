import { useState, useEffect } from 'react';
import { Plus, Truck, Search, Package, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import Modal from '../components/Modal.jsx';

const API = '/api';
const fmt = (n) => `$${Number(n).toFixed(2)}`;

export default function Reabastecimiento() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  async function fetchOrders() {
    const r = await fetch(`${API}/restocking`);
    const data = await r.json();
    setOrders(Array.isArray(data) ? data : []);
  }

  async function fetchProducts() {
    const r = await fetch(`${API}/products`);
    const data = await r.json();
    setProducts(Array.isArray(data) ? data : []);
  }

  function addProductToOrder(product) {
    setOrderItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev;
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity_added: 1,
        cost_per_unit: 0
      }];
    });
    setProductSearch('');
  }

  function updateItem(idx, field, value) {
    setOrderItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeItem(idx) {
    setOrderItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function saveOrder() {
    if (!supplier.trim()) { setError('El nombre del proveedor es requerido'); return; }
    if (orderItems.length === 0) { setError('Agrega al menos un producto'); return; }
    setSaving(true);
    setError('');

    const r = await fetch(`${API}/restocking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplier_name: supplier.trim(), notes, items: orderItems })
    });
    const data = await r.json();
    setSaving(false);
    if (!r.ok) { setError(data.error || 'Error al guardar'); return; }
    setShowModal(false);
    setSupplier('');
    setNotes('');
    setOrderItems([]);
    fetchOrders();
    fetchProducts();
  }

  function openNew() {
    setSupplier('');
    setNotes('');
    setOrderItems([]);
    setError('');
    setShowModal(true);
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.barcode && p.barcode.includes(productSearch))
  ).slice(0, 8);

  const orderTotal = orderItems.reduce((s, i) => s + (i.quantity_added * i.cost_per_unit), 0);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Reabastecimiento</h1>
          <p className="text-slate-500 text-sm">Pedidos a proveedores y entrada de mercancía</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo pedido
        </button>
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="card text-center py-16">
          <Truck size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">No hay pedidos registrados</p>
          <p className="text-slate-400 text-sm mt-1">Crea tu primer pedido a proveedor</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="card p-0 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-orange-50 transition-colors"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Truck size={18} className="text-brand-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">{order.supplier_name}</p>
                    <p className="text-xs text-slate-400">{order.restock_date} · {order.items?.length || 0} producto(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-black text-brand-600">{fmt(order.total_cost)}</p>
                    <p className="text-xs text-slate-400">costo total</p>
                  </div>
                  {expandedOrder === order.id
                    ? <ChevronDown size={16} className="text-slate-400" />
                    : <ChevronRight size={16} className="text-slate-400" />
                  }
                </div>
              </button>

              {expandedOrder === order.id && (
                <div className="border-t border-orange-100 px-5 py-4">
                  {order.notes && (
                    <p className="text-sm text-slate-500 mb-3 italic">"{order.notes}"</p>
                  )}
                  <table className="w-full text-sm">
                    <thead className="text-xs font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="text-left pb-2">Producto</th>
                        <th className="text-center pb-2">Piezas</th>
                        <th className="text-right pb-2">Costo/u</th>
                        <th className="text-right pb-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-50">
                      {(order.items || []).map(item => (
                        <tr key={item.id}>
                          <td className="py-2 font-medium text-slate-700">{item.product_name}</td>
                          <td className="py-2 text-center font-bold text-accent-600">+{item.quantity_added}</td>
                          <td className="py-2 text-right text-slate-600">{fmt(item.cost_per_unit)}</td>
                          <td className="py-2 text-right font-bold">{fmt(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New order modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo pedido a proveedor" size="lg">
        <div className="space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Nombre del proveedor *</label>
              <input value={supplier} onChange={e => setSupplier(e.target.value)} className="input" placeholder="Ej: Distribuidora García" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Notas (opcional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Entrega, crédito, etc." />
            </div>
          </div>

          {/* Product search */}
          <div>
            <label className="label">Buscar producto para agregar</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="input pl-8"
                placeholder="Nombre o código de barras..."
              />
            </div>
            {productSearch && (
              <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden shadow-md bg-white z-10">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProductToOrder(p)}
                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 flex justify-between items-center border-b border-slate-50 last:border-0 text-sm"
                  >
                    <span className="font-medium text-slate-800">{p.name}</span>
                    <span className="text-xs text-slate-400">Stock: {p.stock}</span>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="px-4 py-3 text-sm text-slate-400">No se encontraron productos</p>
                )}
              </div>
            )}
          </div>

          {/* Order items */}
          {orderItems.length > 0 && (
            <div>
              <label className="label">Productos en el pedido</label>
              <div className="space-y-2">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-orange-50 rounded-xl px-3 py-2.5 border border-orange-100">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-800">{item.product_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="label text-xs mb-0.5">Piezas</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity_added}
                          onChange={e => updateItem(idx, 'quantity_added', parseInt(e.target.value) || 1)}
                          className="input w-20 text-center text-sm py-1"
                        />
                      </div>
                      <div>
                        <label className="label text-xs mb-0.5">Costo/u</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.cost_per_unit}
                          onChange={e => updateItem(idx, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                          className="input w-24 text-sm py-1"
                          placeholder="$0.00"
                        />
                      </div>
                    </div>
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                <div className="flex justify-between items-center px-3 pt-2 border-t border-orange-200">
                  <span className="text-sm font-bold text-slate-600">Costo total del pedido</span>
                  <span className="text-xl font-black text-brand-600">{fmt(orderTotal)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={saveOrder} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : 'Registrar pedido y actualizar stock'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

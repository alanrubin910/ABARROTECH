import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scan, Grid3X3, Plus, Minus, Trash2, CreditCard, Banknote,
  ArrowLeftRight, CheckCircle, UserCircle, X, ShoppingBag,
  Search, Camera, ChevronUp, Store, AlertTriangle, Scale, Settings, Percent, Edit2, Check
} from 'lucide-react';
import Modal from '../components/Modal.jsx';
import CameraScanner from '../components/CameraScanner.jsx';
import WeightCalculator from '../components/WeightCalculator.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';

const DEFAULT_TERMINALS = [];

function fmtKg(qty) {
  const grams = Math.round(qty * 1000);
  if (grams < 1000) return `${grams}g`;
  const k = parseFloat(qty.toFixed(3));
  return `${k} kg`;
}

const API = '/api';
const fmt = (n) => `$${Number(n).toFixed(2)}`;

// Subcomponente: item en el ticket
function TicketItem({ item, onQty, onRemove }) {
  const isWeight = item.unit === 'kg';
  return (
    <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 pr-2">
          <p className="font-semibold text-sm text-slate-800 leading-tight">{item.product_name}</p>
          {isWeight && (
            <div className="flex items-center gap-1 mt-0.5">
              <Scale size={10} className="text-brand-400" />
              <span className="text-xs text-brand-500 font-medium">por peso</span>
            </div>
          )}
        </div>
        <button onClick={() => onRemove(item.product_id)} className="text-red-400 hover:text-red-600 flex-shrink-0 p-0.5">
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isWeight ? (
            <span className="bg-brand-100 text-brand-700 font-bold text-sm px-3 py-1 rounded-lg">
              {fmtKg(item.quantity)}
            </span>
          ) : (
            <>
              <button onClick={() => onQty(item.product_id, -1)} className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors">
                <Minus size={13} />
              </button>
              <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
              <button onClick={() => onQty(item.product_id, 1)} className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-green-50 hover:border-green-200 transition-colors">
                <Plus size={13} />
              </button>
            </>
          )}
        </div>
        <p className="font-black text-brand-600 text-sm">{fmt(item.price * item.quantity)}</p>
      </div>
    </div>
  );
}

export default function POS() {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState('scanner');       // 'scanner' | 'touch'
  const [scannerMode, setScannerMode] = useState('usb'); // 'usb' | 'camera'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Todas']);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [searchGrid, setSearchGrid] = useState('');
  const [ticket, setTicket] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pos_ticket') || '[]'); } catch { return []; }
  });
  const [scanInput, setScanInput] = useState('');
  const [flashProduct, setFlashProduct] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showMobileTicket, setShowMobileTicket] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [weightProduct, setWeightProduct] = useState(null);
  const [lastSale, setLastSale] = useState(null);
  const [payMethod, setPayMethod] = useState('efectivo');
  const [cashInput, setCashInput] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [openingCash, setOpeningCash] = useState('');

  // Terminales y comisiones
  const [terminals, setTerminals] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_terminals');
      return saved ? JSON.parse(saved) : DEFAULT_TERMINALS;
    } catch { return DEFAULT_TERMINALS; }
  });
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const [showTerminalManager, setShowTerminalManager] = useState(false);
  const [newTerminalForm, setNewTerminalForm] = useState({ name: '', rate: '' });
  const [editingTerminal, setEditingTerminal] = useState(null); // { id, name, rate }
  const scanRef = useRef(null);
  const scanLockRef = useRef(false); // evita doble procesamiento de un mismo scan

  const total = ticket.reduce((s, i) => s + i.price * i.quantity, 0);
  // Kg items cuentan como 1 línea; piezas cuentan por cantidad
  const itemCount = ticket.reduce((s, i) => s + (i.unit === 'kg' ? 1 : i.quantity), 0);

  useEffect(() => { localStorage.setItem('pos_ticket', JSON.stringify(ticket)); }, [ticket]);
  useEffect(() => { localStorage.setItem('pos_terminals', JSON.stringify(terminals)); }, [terminals]);

  useEffect(() => { fetchProducts(); fetchSessions(); }, []);

  useEffect(() => {
    if (mode === 'scanner' && scannerMode === 'usb' && scanRef.current) {
      scanRef.current.focus();
    }
  }, [mode, scannerMode]);

  async function fetchProducts() {
    const r = await fetch(`${API}/products`);
    const data = await r.json();
    setProducts(data);
    const cats = ['Todas', ...new Set(data.map(p => p.category))];
    setCategories(cats);
  }

  async function fetchSessions() {
    const r = await fetch(`${API}/sessions/active`);
    const data = await r.json();
    setSessions(data);
    if (data.length > 0 && !activeSession) setActiveSession(data[0]);
  }

  async function openSession() {
    if (!cashierName.trim()) return;
    const r = await fetch(`${API}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cashier_name: cashierName.trim(), opening_cash: parseFloat(openingCash) || 0 })
    });
    const data = await r.json();
    if (r.ok) {
      setActiveSession(data);
      setSessions(prev => [...prev, data]);
      setShowSessionModal(false);
      setCashierName(''); setOpeningCash('');
    }
  }

  function addToTicket(product) {
    if (product.stock === 0) {
      setFlashProduct({ ...product, _stockError: 'agotado' });
      setTimeout(() => setFlashProduct(null), 2500);
      return;
    }

    // Producto por peso → abrir calculadora
    if (product.unit === 'kg') {
      setWeightProduct(product);
      return;
    }

    // Bloquear si el ticket ya lleva todo el stock disponible
    const inTicket = ticket.find(i => i.product_id === product.id);
    const qtyEnTicket = inTicket ? inTicket.quantity : 0;
    if (qtyEnTicket >= product.stock) {
      setFlashProduct({ ...product, _stockError: 'limite', _disponible: product.stock });
      setTimeout(() => setFlashProduct(null), 2500);
      return;
    }

    setTicket(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        product_id: product.id, product_name: product.name,
        product_barcode: product.barcode, price: product.price,
        quantity: 1, unit: product.unit
      }];
    });
    setFlashProduct(product);
  }

  function addWeightToTicket(product, quantityKg) {
    setTicket(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: parseFloat((i.quantity + quantityKg).toFixed(6)) }
          : i
        );
      }
      return [...prev, {
        product_id: product.id, product_name: product.name,
        product_barcode: product.barcode, price: product.price,
        quantity: quantityKg, unit: 'kg'
      }];
    });
    setWeightProduct(null);
    setFlashProduct({ ...product, _weightKg: quantityKg });
  }

  async function handleBarcodeFound(code) {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setTimeout(() => { scanLockRef.current = false; }, 1500); // unlock después de 1.5s

    const r = await fetch(`${API}/products/barcode/${encodeURIComponent(code)}`);
    if (!r.ok) {
      setFlashProduct({ name: 'Producto no encontrado', price: 0, notFound: true });
      setTimeout(() => setFlashProduct(null), 1500);
      return;
    }
    const product = await r.json();
    addToTicket(product);
  }

  async function handleScanInput(e) {
    if (e.key !== 'Enter') return;
    const code = scanInput.trim();
    setScanInput('');
    if (!code) return;
    await handleBarcodeFound(code);
  }

  function updateQty(productId, delta) {
    if (delta > 0) {
      const product = products.find(p => p.id === productId);
      const item = ticket.find(i => i.product_id === productId);
      if (product && item && item.quantity >= product.stock) return; // no exceder stock
    }
    setTicket(prev => prev
      .map(i => i.product_id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    );
  }

  function removeItem(productId) {
    setTicket(prev => prev.filter(i => i.product_id !== productId));
  }

  async function completeSale() {
    if (!activeSession) { setShowPayModal(false); setShowSessionModal(true); return; }
    if (ticket.length === 0) return;
    const cashReceived = parseFloat(cashInput) || 0;
    const r = await fetch(`${API}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: activeSession.id,
        cashier_name: activeSession.cashier_name,
        payment_method: payMethod,
        items: ticket,
        cash_received: payMethod === 'efectivo' ? cashReceived : null,
        commission_rate:   payMethod === 'tarjeta' && selectedTerminal ? selectedTerminal.rate : 0,
        commission_amount: payMethod === 'tarjeta' ? commission : 0,
        terminal_name:     payMethod === 'tarjeta' && selectedTerminal ? selectedTerminal.name : null
      })
    });
    const sale = await r.json();
    if (r.ok) {
      setLastSale(sale);
      setTicket([]);
      setFlashProduct(null);
      setCashInput('');
      setShowPayModal(false);
      setShowMobileTicket(false);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
      fetchProducts(); // refrescar stock después de la venta
    } else {
      // Error de stock u otro error del servidor
      setShowPayModal(false);
      setFlashProduct({ name: sale.error || 'Error al procesar la venta', notFound: true });
      setTimeout(() => setFlashProduct(null), 4000);
      fetchProducts(); // refrescar para mostrar stock actualizado
    }
  }

  function openPayModal() {
    if (!activeSession) { setShowSessionModal(true); return; }
    if (ticket.length === 0) return;
    setPayMethod('efectivo');
    setCashInput('');
    if (!selectedTerminal && terminals.length > 0) setSelectedTerminal(terminals[0]);
    setShowPayModal(true);
  }

  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'Todas' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchGrid.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchGrid));
    return matchCat && matchSearch;
  });

  const change = payMethod === 'efectivo' ? Math.max(0, (parseFloat(cashInput) || 0) - total) : 0;
  const commission = payMethod === 'tarjeta' && selectedTerminal
    ? parseFloat((total * selectedTerminal.rate / 100).toFixed(2))
    : 0;
  const totalConComision = parseFloat((total + commission).toFixed(2));

  /* ── RENDER ─────────────────────────────────────────────── */
  return (
    <div className="flex h-full overflow-hidden relative">

      {/* ══════════════════════════════════════════════
          PANEL IZQUIERDO / ÁREA PRINCIPAL
      ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <div className="bg-white border-b border-orange-100 px-3 md:px-5 py-3 flex items-center justify-between gap-2 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Store size={18} className="text-brand-500 md:hidden flex-shrink-0" />
            <h1 className="font-bold text-base md:text-lg text-slate-800 truncate">Punto de Venta</h1>
            {activeSession && (
              <span className="hidden sm:inline bg-accent-100 text-accent-600 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                {activeSession.cashier_name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mode toggle */}
            <div className="flex bg-orange-100 rounded-xl p-1 gap-0.5">
              <button
                onClick={() => setMode('scanner')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'scanner' ? 'bg-brand-500 text-white shadow-sm' : 'text-brand-700 hover:bg-orange-200'
                }`}
              >
                <Scan size={14} /> <span className="hidden sm:inline">Scanner</span>
              </button>
              <button
                onClick={() => setMode('touch')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'touch' ? 'bg-brand-500 text-white shadow-sm' : 'text-brand-700 hover:bg-orange-200'
                }`}
              >
                <Grid3X3 size={14} /> <span className="hidden sm:inline">Toque</span>
              </button>
            </div>

            <button
              onClick={() => setShowSessionModal(true)}
              className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 border border-brand-200 px-2 py-1.5 rounded-xl hover:bg-orange-50 transition-colors"
            >
              <UserCircle size={15} />
              <span className="hidden sm:inline">{activeSession ? activeSession.cashier_name : 'Abrir caja'}</span>
            </button>
          </div>
        </div>

        {/* ── MODO SCANNER ── */}
        {mode === 'scanner' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 overflow-y-auto">
            <div className="card w-full max-w-md text-center">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Scan size={28} className="text-brand-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Escanear producto</h2>

              {/* Sub-mode: USB vs Cámara */}
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mb-4 mx-auto max-w-xs">
                <button
                  onClick={() => setScannerMode('usb')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    scannerMode === 'usb' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Scan size={13} /> Pistola USB
                </button>
                <button
                  onClick={() => setScannerMode('camera')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    scannerMode === 'camera' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Camera size={13} /> Cámara
                </button>
              </div>

              {scannerMode === 'usb' ? (
                <>
                  <p className="text-xs text-slate-400 mb-3">Haz clic aquí y escanea con la pistola</p>
                  <input
                    ref={scanRef}
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    onKeyDown={handleScanInput}
                    placeholder="Esperando código..."
                    className="input text-center text-base font-mono tracking-widest"
                    autoFocus
                  />
                </>
              ) : (
                <div>
                  <p className="text-xs text-slate-400 mb-3">Apunta la cámara al código de barras del producto</p>
                  <button
                    onClick={() => setShowCameraModal(true)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Camera size={16} /> Abrir cámara
                  </button>
                </div>
              )}
            </div>

            {/* Flash del producto escaneado */}
            {flashProduct && (
              <div className={`card w-full max-w-md text-center border-2 transition-all ${
                flashProduct.notFound || flashProduct._stockError
                  ? 'border-red-300 bg-red-50'
                  : 'border-green-300 bg-green-50'
              }`}>
                {flashProduct.notFound ? (
                  <p className="text-red-600 font-bold text-lg">Producto no encontrado</p>
                ) : flashProduct._stockError === 'agotado' ? (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <AlertTriangle size={20} className="text-red-500" />
                      <p className="text-red-600 font-bold text-lg">Producto AGOTADO</p>
                    </div>
                    <p className="text-base font-semibold text-slate-700">{flashProduct.name}</p>
                    <p className="text-xs text-red-500 mt-1 font-medium">Stock: 0 — No se puede vender</p>
                  </>
                ) : flashProduct._stockError === 'limite' ? (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <AlertTriangle size={20} className="text-amber-500" />
                      <p className="text-amber-700 font-bold text-lg">Límite de stock</p>
                    </div>
                    <p className="text-base font-semibold text-slate-700">{flashProduct.name}</p>
                    <p className="text-xs text-amber-600 mt-1 font-medium">Solo hay {flashProduct._disponible} en existencia</p>
                  </>
                ) : flashProduct._weightKg ? (
                  <>
                    <p className="text-xl font-bold text-slate-800">{flashProduct.name}</p>
                    <p className="text-3xl font-black text-brand-500 mt-1">
                      {fmtKg(flashProduct._weightKg)}
                    </p>
                    <p className="text-lg font-bold text-slate-600">{fmt(flashProduct.price * flashProduct._weightKg)}</p>
                    <p className="text-xs text-slate-400 mt-1">Agregado al ticket</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-slate-800">{flashProduct.name}</p>
                    <p className="text-3xl font-black text-brand-500 mt-1">{fmt(flashProduct.price)}</p>
                    <p className="text-xs text-slate-400 mt-1">Agregado al ticket</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MODO TOQUE ── */}
        {mode === 'touch' && (
          <div className="flex-1 flex flex-col overflow-hidden p-3 md:p-4 gap-3">
            {/* Búsqueda + categorías */}
            <div className="relative flex-shrink-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchGrid}
                onChange={e => setSearchGrid(e.target.value)}
                placeholder="Buscar producto..."
                className="input pl-8 text-sm"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    activeCategory === cat
                      ? 'bg-brand-500 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid de productos */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToTicket(product)}
                    className={`bg-white rounded-2xl border-2 p-3 md:p-4 text-left transition-all hover:shadow-md hover:border-brand-300 active:scale-95 ${
                      flashProduct?.id === product.id ? 'border-accent-500 bg-accent-50' : 'border-orange-100'
                    }`}
                  >
                    <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
                      <ShoppingBag size={18} className="text-brand-500" />
                    </div>
                    <p className="font-semibold text-xs md:text-sm text-slate-800 leading-tight line-clamp-2">{product.name}</p>
                    <p className="text-brand-600 font-black text-base md:text-lg mt-1">
                      {fmt(product.price)}{product.unit === 'kg' ? '/kg' : ''}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {product.unit === 'kg' && <Scale size={10} className="text-brand-400 flex-shrink-0" />}
                      <p className={`text-xs font-medium ${product.stock <= product.min_stock ? 'text-red-400' : 'text-slate-400'}`}>
                        {product.unit === 'kg' ? fmtKg(product.stock) : `${product.stock} ${product.unit}`}
                      </p>
                    </div>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full text-center py-10 text-slate-400">
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Sin productos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          TICKET DESKTOP (panel derecho fijo — solo en escritorio)
      ══════════════════════════════════════════════ */}
      {!isMobile && <div className="w-80 bg-white border-l border-orange-100 flex flex-col shadow-xl flex-shrink-0">
        <TicketPanel
          ticket={ticket}
          total={total}
          itemCount={itemCount}
          onQty={updateQty}
          onRemove={removeItem}
          onClear={() => { setTicket([]); setFlashProduct(null); }}
          onPay={openPayModal}
        />
      </div>}

      {/* ══════════════════════════════════════════════
          TICKET MÓVIL: botón flotante + drawer
      ══════════════════════════════════════════════ */}
      {/* Botón flotante carrito — solo en móvil */}
      {isMobile && !showMobileTicket && itemCount > 0 && (
        <button
          onClick={() => setShowMobileTicket(true)}
          className="fixed bottom-20 right-4 z-30 bg-brand-500 text-white rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2 font-bold"
        >
          <ShoppingBag size={20} />
          <span>{itemCount}</span>
          <span className="text-brand-200 text-sm font-normal">·</span>
          <span>{fmt(total)}</span>
          <ChevronUp size={16} />
        </button>
      )}

      {/* Drawer móvil (desliza desde abajo) — solo en móvil */}
      {isMobile && showMobileTicket && (
        <div className="fixed inset-0 z-30">
          {/* Fondo oscuro */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileTicket(false)} />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] flex flex-col"
               style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-b border-orange-100 flex-shrink-0">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <ShoppingBag size={16} className="text-brand-500" /> Ticket
              </h2>
              <button onClick={() => setShowMobileTicket(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <TicketPanel
              ticket={ticket}
              total={total}
              itemCount={itemCount}
              onQty={updateQty}
              onRemove={removeItem}
              onClear={() => { setTicket([]); setFlashProduct(null); }}
              onPay={() => { setShowMobileTicket(false); setTimeout(openPayModal, 100); }}
              mobile
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODALES
      ══════════════════════════════════════════════ */}

      {/* Gestión de terminales */}
      <Modal open={showTerminalManager} onClose={() => { setShowTerminalManager(false); setNewTerminalForm({ name: '', rate: '' }); setEditingTerminal(null); }} title="Mis terminales" size="sm" layer="top">
        <div className="space-y-3">
          {terminals.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-3">Aún no tienes terminales. Agrega una abajo.</p>
          ) : (
            <div className="space-y-2">
              {terminals.map(t => (
                <div key={t.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  {editingTerminal?.id === t.id ? (
                    /* ── Modo edición ── */
                    <div className="p-3 space-y-2 bg-orange-50">
                      <div className="flex gap-2">
                        <input
                          value={editingTerminal.name}
                          onChange={e => setEditingTerminal(et => ({ ...et, name: e.target.value }))}
                          placeholder="Nombre"
                          className="input flex-1 text-sm"
                          autoFocus
                        />
                        <div className="relative w-24 flex-shrink-0">
                          <input
                            value={editingTerminal.rate}
                            onChange={e => setEditingTerminal(et => ({ ...et, rate: e.target.value }))}
                            type="number" step="0.01" placeholder="3.5"
                            className="input text-sm text-center pr-5"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTerminal(null)}
                          className="btn-secondary flex-1 py-1.5 text-sm">
                          Cancelar
                        </button>
                        <button
                          onClick={() => {
                            const name = editingTerminal.name.trim();
                            const rate = parseFloat(editingTerminal.rate);
                            if (!name || !rate || rate <= 0) return;
                            setTerminals(prev => prev.map(x =>
                              x.id === t.id ? { ...x, name, rate } : x
                            ));
                            if (selectedTerminal?.id === t.id) setSelectedTerminal({ ...t, name, rate });
                            setEditingTerminal(null);
                          }}
                          disabled={!editingTerminal.name.trim() || !editingTerminal.rate}
                          className="btn-primary flex-1 py-1.5 text-sm flex items-center justify-center gap-1 disabled:opacity-50">
                          <Check size={14} /> Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Modo vista ── */
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-800">{t.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-0.5">
                          <Percent size={10} /> {t.rate}% de comisión
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingTerminal({ id: t.id, name: t.name, rate: String(t.rate) })}
                          className="p-1.5 hover:bg-brand-100 text-brand-500 rounded-lg transition-colors" title="Editar">
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setTerminals(prev => prev.filter(x => x.id !== t.id));
                            if (selectedTerminal?.id === t.id) setSelectedTerminal(null);
                          }}
                          className="p-1.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Formulario para agregar */}
          <div className="border border-orange-200 rounded-xl p-3 space-y-2 bg-orange-50/40">
            <p className="text-sm font-bold text-slate-600">Agregar terminal</p>
            <div className="flex gap-2">
              <input
                value={newTerminalForm.name}
                onChange={e => setNewTerminalForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre (ej: mi terminal)"
                className="input flex-1 text-sm"
              />
              <div className="relative w-24 flex-shrink-0">
                <input
                  value={newTerminalForm.rate}
                  onChange={e => setNewTerminalForm(f => ({ ...f, rate: e.target.value }))}
                  type="number" step="0.01" placeholder="3.5"
                  className="input text-sm text-center pr-5"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
              </div>
            </div>
            <button
              onClick={() => {
                const name = newTerminalForm.name.trim();
                const rate = parseFloat(newTerminalForm.rate);
                if (!name || !rate || rate <= 0) return;
                const t = { id: Date.now(), name, rate };
                setTerminals(prev => [...prev, t]);
                if (!selectedTerminal) setSelectedTerminal(t);
                setNewTerminalForm({ name: '', rate: '' });
              }}
              disabled={!newTerminalForm.name.trim() || !newTerminalForm.rate}
              className="btn-primary w-full text-sm py-2 disabled:opacity-50"
            >
              Guardar terminal
            </button>
          </div>
        </div>
      </Modal>

      {/* Calculadora de peso */}
      <Modal open={!!weightProduct} onClose={() => setWeightProduct(null)} title="Venta por peso" size="sm">
        {weightProduct && (
          <WeightCalculator
            product={weightProduct}
            currentQtyKg={ticket.find(i => i.product_id === weightProduct.id)?.quantity || 0}
            onAdd={(qty) => addWeightToTicket(weightProduct, qty)}
            onClose={() => setWeightProduct(null)}
          />
        )}
      </Modal>

      {/* Cámara */}
      <Modal open={showCameraModal} onClose={() => setShowCameraModal(false)} title="Escanear con cámara" size="sm">
        <CameraScanner
          onScan={async (code) => {
            setShowCameraModal(false);
            await handleBarcodeFound(code);
          }}
          onClose={() => setShowCameraModal(false)}
        />
      </Modal>

      {/* Sesión / Cajero */}
      <Modal open={showSessionModal} onClose={() => setShowSessionModal(false)} title="Cajero / Caja" size="sm">
        <div className="space-y-4">
          {sessions.length > 0 && (
            <div>
              <p className="label">Cajeros activos hoy</p>
              <div className="space-y-2">
                {sessions.map(s => (
                  <div key={s.id} className={`rounded-xl border-2 overflow-hidden transition-all ${
                    activeSession?.id === s.id ? 'border-brand-500' : 'border-slate-200'
                  }`}>
                    <button
                      onClick={() => { setActiveSession(s); setShowSessionModal(false); }}
                      className={`w-full text-left px-4 py-3 transition-all ${
                        activeSession?.id === s.id ? 'bg-orange-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-bold text-slate-800">{s.cashier_name}</p>
                      <p className="text-xs text-slate-400">Abierto: {s.opened_at}</p>
                    </button>
                    <div className="flex border-t border-slate-100">
                      <button
                        onClick={async () => {
                          await fetch(`${API}/sessions/${s.id}/close`, { method: 'PUT' });
                          if (activeSession?.id === s.id) setActiveSession(null);
                          fetchSessions();
                        }}
                        className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                      >
                        Cerrar caja
                      </button>
                      <div className="w-px bg-slate-100" />
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Cerrar la caja de "${s.cashier_name}"?`)) return;
                          await fetch(`${API}/sessions/${s.id}`, { method: 'DELETE' });
                          if (activeSession?.id === s.id) setActiveSession(null);
                          fetchSessions();
                        }}
                        className="flex-1 py-2 text-xs font-semibold text-red-400 hover:bg-red-50 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="border-t pt-4 space-y-3">
            <p className="label">Nuevo cajero</p>
            <div>
              <label className="label">Nombre</label>
              <input value={cashierName} onChange={e => setCashierName(e.target.value)} className="input" placeholder="Ej: María García" />
            </div>
            <div>
              <label className="label">Efectivo al abrir ($)</label>
              <input value={openingCash} onChange={e => setOpeningCash(e.target.value)} type="number" className="input" placeholder="0.00" />
            </div>
            <button onClick={openSession} className="btn-primary w-full">Abrir caja</button>
          </div>
        </div>
      </Modal>

      {/* Pago */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Cobrar" size="sm">
        <div className="space-y-4">
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {ticket.map(i => (
                <div key={i.product_id} className="flex justify-between text-sm">
                  <span className="text-slate-600 truncate">
                    {i.product_name}&nbsp;
                    {i.unit === 'kg' ? `× ${fmtKg(i.quantity)}` : `×${i.quantity}`}
                  </span>
                  <span className="font-semibold ml-2 flex-shrink-0">{fmt(i.price * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-orange-200 mt-3 pt-3 flex justify-between items-center">
              <span className="font-bold text-slate-700">TOTAL</span>
              <span className="text-2xl font-black text-brand-600">{fmt(total)}</span>
            </div>
          </div>

          <div>
            <label className="label">Forma de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'efectivo',      icon: Banknote,       label: 'Efectivo'      },
                { value: 'tarjeta',       icon: CreditCard,     label: 'Tarjeta'       },
                { value: 'transferencia', icon: ArrowLeftRight, label: 'Transferencia' },
              ].map(({ value, icon: Icon, label }) => (
                <button key={value} onClick={() => setPayMethod(value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    payMethod === value ? 'border-brand-500 bg-orange-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-brand-300'
                  }`}>
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
          </div>

          {payMethod === 'tarjeta' && (
            <div className="space-y-2.5">
              {/* Selector de terminal */}
              <div className="flex items-center justify-between">
                <label className="label mb-0">Terminal</label>
                <button onClick={() => setShowTerminalManager(true)}
                  className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1">
                  <Settings size={12} /> Gestionar
                </button>
              </div>
              {terminals.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-sm mb-2">No hay terminales configuradas</p>
                  <button onClick={() => setShowTerminalManager(true)} className="btn-secondary text-sm py-1.5">
                    + Agregar terminal
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5">
                  {terminals.map(t => (
                    <button key={t.id} onClick={() => setSelectedTerminal(t)}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        selectedTerminal?.id === t.id
                          ? 'border-brand-500 bg-orange-50 text-brand-700'
                          : 'border-slate-200 text-slate-600 hover:border-brand-300'
                      }`}>
                      <span>{t.name}</span>
                      <span className={`font-mono flex items-center gap-0.5 ${selectedTerminal?.id === t.id ? 'text-brand-500' : 'text-slate-400'}`}>
                        <Percent size={11} />{t.rate}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Desglose de comisión */}
              {selectedTerminal && commission > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Subtotal productos</span>
                    <span>{fmt(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-orange-700">
                    <span className="flex items-center gap-1">
                      <Percent size={12} /> Comisión {selectedTerminal.name} ({selectedTerminal.rate}%)
                    </span>
                    <span>+ {fmt(commission)}</span>
                  </div>
                  <div className="flex justify-between font-black text-brand-700 text-base pt-1.5 border-t border-orange-200">
                    <span>Total a cobrar</span>
                    <span>{fmt(totalConComision)}</span>
                  </div>
                </div>
              )}
              {!selectedTerminal && (
                <p className="text-xs text-slate-400 text-center">Selecciona una terminal para calcular la comisión</p>
              )}
            </div>
          )}
          {payMethod === 'transferencia' && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-700 font-medium">
              Confirma que recibiste la transferencia antes de cerrar.
            </div>
          )}
          {payMethod === 'efectivo' && (
            <div className="space-y-2">
              <div>
                <label className="label">Efectivo recibido</label>
                <input value={cashInput} onChange={e => setCashInput(e.target.value)} type="number"
                  className="input text-lg font-bold" placeholder="0.00" autoFocus />
              </div>
              {cashInput && (
                <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="font-semibold text-green-700">Cambio</span>
                  <span className="text-xl font-black text-green-700">{fmt(change)}</span>
                </div>
              )}
            </div>
          )}

          <button onClick={completeSale}
            disabled={payMethod === 'efectivo' && cashInput !== '' && parseFloat(cashInput) < total}
            className="btn-success w-full text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed">
            Confirmar · {fmt(payMethod === 'tarjeta' && commission > 0 ? totalConComision : total)}
          </button>
        </div>
      </Modal>

      {/* Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-7 text-center border-2 border-green-200 w-full max-w-xs">
            <CheckCircle size={52} className="text-accent-500 mx-auto mb-3" />
            <p className="text-xl font-black text-slate-800">Venta completada</p>
            <p className="text-3xl font-black text-brand-500 mt-1">{fmt(lastSale?.total || 0)}</p>
            {lastSale?.change_given > 0 && (
              <p className="text-sm text-slate-500 mt-1">Cambio: {fmt(lastSale.change_given)}</p>
            )}
            {lastSale?.commission_amount > 0 && (
              <p className="text-xs text-orange-500 font-semibold mt-1">
                Incl. comisión {lastSale.terminal_name}: {fmt(lastSale.commission_amount)}
              </p>
            )}
            <span className={`mt-2 text-xs font-bold inline-block px-3 py-1 rounded-full ${
              lastSale?.payment_method === 'efectivo' ? 'bg-green-100 text-green-700' :
              lastSale?.payment_method === 'tarjeta' ? 'bg-blue-100 text-blue-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {lastSale?.payment_method?.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-componente reutilizable: panel del ticket ─────── */
function TicketPanel({ ticket, total, itemCount, onQty, onRemove, onClear, onPay, mobile }) {
  return (
    <>
      {!mobile && (
        <div className="px-4 py-3 border-b border-orange-100 bg-orange-50 flex-shrink-0">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <ShoppingBag size={16} className="text-brand-500" /> Ticket actual
          </h2>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {ticket.length === 0 && (
          <div className="text-center py-10 text-slate-300">
            <ShoppingBag size={36} className="mx-auto mb-2" />
            <p className="text-sm">Ticket vacío</p>
          </div>
        )}
        {ticket.map(item => (
          <TicketItem key={item.product_id} item={item} onQty={onQty} onRemove={onRemove} />
        ))}
      </div>

      <div className="border-t border-orange-100 p-4 space-y-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-sm font-medium">{itemCount} producto(s)</span>
          <span className="text-2xl font-black text-slate-800">{fmt(total)}</span>
        </div>
        {ticket.length > 0 && (
          <>
            <button onClick={onClear} className="btn-secondary w-full text-sm py-2">Limpiar ticket</button>
            <button onClick={onPay} className="btn-success w-full text-base py-3">
              Cobrar {fmt(total)}
            </button>
          </>
        )}
      </div>
    </>
  );
}

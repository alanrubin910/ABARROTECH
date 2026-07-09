import { useState } from 'react';
import { Scale } from 'lucide-react';

function fmtKg(qty) {
  const grams = Math.round(qty * 1000);
  if (grams < 1000) return `${grams}g`;
  const k = parseFloat(qty.toFixed(3));
  return `${k} kg`;
}

export default function WeightCalculator({ product, currentQtyKg = 0, onAdd, onClose }) {
  const [mode, setMode] = useState('gramos');
  const [inputVal, setInputVal] = useState('');

  const numVal = parseFloat(inputVal) || 0;
  const pricePerGram = product.price / 1000;

  const qtyKg   = mode === 'gramos' ? numVal / 1000 : numVal / product.price;
  const subtotal = mode === 'gramos' ? numVal * pricePerGram : numVal;

  const available = Math.max(0, product.stock - currentQtyKg);
  const overStock = qtyKg > available && qtyKg > 0;

  const resultText = mode === 'gramos'
    ? (numVal > 0 ? `$${subtotal.toFixed(2)}` : null)
    : (numVal > 0 ? fmtKg(qtyKg) : null);

  const QUICK_GRAMS = [100, 250, 500, 1000];
  const QUICK_PRICE = [5, 10, 20, 50];

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="text-center">
        <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
          <Scale size={24} className="text-brand-500" />
        </div>
        <p className="font-black text-slate-800 text-lg">{product.name}</p>
        <p className="text-slate-500 text-sm">
          ${product.price.toFixed(2)} / kg &nbsp;·&nbsp; Stock disponible: {fmtKg(available)}
        </p>
      </div>

      {/* Tabs de modo */}
      <div className="flex bg-slate-100 rounded-xl p-1">
        {[
          { key: 'gramos', label: 'Por gramos' },
          { key: 'precio', label: 'Por precio ($)' },
        ].map(({ key, label }) => (
          <button key={key}
            onClick={() => { setMode(key); setInputVal(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input principal */}
      <div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
            {mode === 'precio' ? '$' : ''}
          </span>
          <input
            type="number"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder={mode === 'gramos' ? 'Ej: 250' : 'Ej: 10.00'}
            className={`input text-2xl font-bold text-center h-14 ${mode === 'precio' ? 'pl-8' : ''}`}
            autoFocus
          />
          {mode === 'gramos' && inputVal && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">g</span>
          )}
        </div>

        {/* Botones rápidos */}
        <div className="flex gap-2 mt-2">
          {mode === 'gramos'
            ? QUICK_GRAMS.map(g => (
                <button key={g} onClick={() => setInputVal(String(g))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    inputVal === String(g)
                      ? 'bg-brand-500 text-white'
                      : 'bg-orange-50 hover:bg-orange-100 text-brand-600'
                  }`}>
                  {g < 1000 ? `${g}g` : '1 kg'}
                </button>
              ))
            : QUICK_PRICE.map(p => (
                <button key={p} onClick={() => setInputVal(String(p))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    inputVal === String(p)
                      ? 'bg-brand-500 text-white'
                      : 'bg-orange-50 hover:bg-orange-100 text-brand-600'
                  }`}>
                  ${p}
                </button>
              ))
          }
        </div>
      </div>

      {/* Resultado en tiempo real */}
      {resultText ? (
        <div className={`rounded-xl p-5 text-center border-2 transition-colors ${
          overStock ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}>
          {overStock ? (
            <p className="text-red-600 font-bold">Solo hay {fmtKg(available)} disponible</p>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-1">
                {mode === 'gramos' ? 'Total a cobrar al cliente' : 'Gramos que debes dar'}
              </p>
              <p className="text-4xl font-black text-green-700">{resultText}</p>
              {mode === 'precio' && qtyKg > 0 && (
                <p className="text-sm text-slate-500 mt-1">equivale a {fmtKg(qtyKg)}</p>
              )}
              {mode === 'gramos' && numVal > 0 && (
                <p className="text-sm text-slate-500 mt-1">
                  por {numVal < 1000 ? `${numVal}g` : `${numVal / 1000} kg`}
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-5 text-center border-2 border-dashed border-slate-200 text-slate-300">
          <Scale size={28} className="mx-auto mb-1 opacity-30" />
          <p className="text-sm">El resultado aparecerá aquí</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button
          onClick={() => { if (qtyKg > 0 && !overStock) onAdd(qtyKg); }}
          disabled={qtyKg <= 0 || overStock}
          className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Agregar al ticket
        </button>
      </div>
    </div>
  );
}

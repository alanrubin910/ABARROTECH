import { useState } from 'react';
import {
  ShoppingCart, Package, Truck, Scissors, BarChart2, KeyRound,
  Clock, AlertTriangle, BookOpen, ChevronDown, ChevronUp,
  CheckCircle, Lightbulb, Star, CreditCard, Banknote, Smartphone,
  Users, Receipt, Calculator, TrendingUp, RefreshCw, Search,
  Barcode, Hash, Tag, Archive
} from 'lucide-react';

// ── Tip box ──────────────────────────────────────────────────────
function Tip({ children }) {
  return (
    <div className="flex gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
      <Lightbulb size={16} className="flex-shrink-0 mt-0.5 text-yellow-500" />
      <span>{children}</span>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="flex gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
      <span>{children}</span>
    </div>
  );
}

function Good({ children }) {
  return (
    <div className="flex gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
      <CheckCircle size={16} className="flex-shrink-0 mt-0.5 text-green-500" />
      <span>{children}</span>
    </div>
  );
}

// ── Step ─────────────────────────────────────────────────────────
function Step({ n, children }) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
        {n}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{children}</p>
    </div>
  );
}

// ── Section card (collapsible) ────────────────────────────────────
function Section({ icon: Icon, color, title, subtitle, children }) {
  const [open, setOpen] = useState(false);

  const colors = {
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', title: 'text-orange-800', badge: 'bg-orange-600' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'bg-blue-100 text-blue-600',   title: 'text-blue-800',   badge: 'bg-blue-600'   },
    green:  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'bg-green-100 text-green-600',  title: 'text-green-800',  badge: 'bg-green-600'  },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600',title: 'text-purple-800', badge: 'bg-purple-600' },
    red:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'bg-red-100 text-red-600',      title: 'text-red-800',    badge: 'bg-red-600'    },
    slate:  { bg: 'bg-slate-50',  border: 'border-slate-200',  icon: 'bg-slate-100 text-slate-600',  title: 'text-slate-800',  badge: 'bg-slate-600'  },
    teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   icon: 'bg-teal-100 text-teal-600',    title: 'text-teal-800',   badge: 'bg-teal-600'   },
  };
  const c = colors[color] || colors.slate;

  return (
    <div className={`rounded-2xl border-2 ${c.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-4 p-5 ${c.bg} text-left`}
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
          <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-base ${c.title}`}>{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className={`${open ? 'rotate-180' : ''} transition-transform text-slate-400`}>
          <ChevronDown size={20} />
        </div>
      </button>

      {open && (
        <div className="p-5 bg-white space-y-4 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function Guia() {
  const [allOpen, setAllOpen] = useState(false);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="text-brand-600" size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-800">Guía de uso · AbarroTech</h1>
        <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
          Aquí encontrarás cómo usar cada parte del sistema, explicado de forma sencilla y paso a paso.
          Toca cualquier sección para abrirla.
        </p>
      </div>

      {/* Quick index */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Contenido de esta guía</p>
        <div className="grid grid-cols-2 gap-1.5 text-sm">
          {[
            ['🛒', 'Punto de Venta'],
            ['📦', 'Almacén'],
            ['🚚', 'Reabastecimiento'],
            ['✂️', 'Corte de Caja'],
            ['📊', 'Reportes'],
            ['📅', 'Caducidades'],
            ['🔑', 'Panel del Dueño'],
            ['❓', 'Preguntas frecuentes'],
          ].map(([emoji, label]) => (
            <div key={label} className="flex items-center gap-2 text-slate-600">
              <span>{emoji}</span> <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">

        {/* ─── PUNTO DE VENTA ─────────────────────────────────── */}
        <Section icon={ShoppingCart} color="orange" title="Punto de Venta" subtitle="Aquí cobras a los clientes — es la parte más usada del sistema">
          <p className="text-sm text-slate-600 leading-relaxed">
            El <strong>Punto de Venta</strong> es donde registras cada venta. Antes de cobrar,
            necesitas abrir una "sesión de caja". Piénsalo como cuando el cajero llega a trabajar y
            abre su caja registradora.
          </p>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-3">¿Cómo abrir la caja y empezar a vender?</p>
            <div className="space-y-2">
              <Step n="1">Entra a <strong>Punto de Venta</strong> desde el menú de la izquierda (ícono de carrito).</Step>
              <Step n="2">Toca el botón <strong>"Nueva sesión"</strong>. Escribe el nombre del cajero y cuánto dinero hay en la caja al inicio (puede ser 0).</Step>
              <Step n="3">Ya puedes buscar productos. Escríbelos por nombre o escanea su código de barras con la cámara.</Step>
              <Step n="4">Cada producto que agregas aparece en la lista del lado derecho con su precio.</Step>
              <Step n="5">Cuando el cliente decida pagar, elige la forma de pago: <strong>Efectivo, Tarjeta o Transferencia</strong>.</Step>
              <Step n="6">Toca <strong>"Cobrar"</strong>. El sistema descuenta el inventario automáticamente.</Step>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">Formas de pago</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <Banknote size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>Efectivo:</strong> Escribes cuánto te dan y el sistema te dice el cambio.</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CreditCard size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <span><strong>Tarjeta:</strong> Puedes agregar la comisión que cobra la terminal (ej. 2.7%). El sistema suma ese extra al total.</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Smartphone size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
                <span><strong>Transferencia:</strong> Puedes anotar la referencia del pago.</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">Productos por kilo o gramo</p>
            <p className="text-sm text-slate-600">Si vendes productos a granel (arroz, frijol, etc.), el sistema tiene una calculadora de peso. Solo dices cuántos kilos y calcula el precio solo.</p>
          </div>

          <Tip>Si te equivocas al agregar un producto, solo borra la cantidad o quítalo de la lista antes de cobrar. No pasa nada.</Tip>
          <Warning>No cierres el navegador a la mitad de una venta sin haberla cobrado, porque podrías perder lo que tenías en el carrito.</Warning>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">¿Cómo cerrar la caja al terminar el día?</p>
            <div className="space-y-2">
              <Step n="1">Toca el ícono de cajero (arriba a la derecha o en el menú de sesiones).</Step>
              <Step n="2">Busca la sesión activa y presiona <strong>"Cerrar caja"</strong>.</Step>
              <Step n="3">El sistema guarda automáticamente cuánto se vendió en efectivo, tarjeta y transferencia.</Step>
            </div>
          </div>
        </Section>

        {/* ─── ALMACÉN ────────────────────────────────────────── */}
        <Section icon={Package} color="blue" title="Almacén" subtitle="Aquí controlas todos tus productos e inventario">
          <p className="text-sm text-slate-600 leading-relaxed">
            En el <strong>Almacén</strong> tienes la lista completa de todo lo que vendes.
            Aquí agregas productos nuevos, cambias precios, ajustas el inventario y organizas
            todo por categorías.
          </p>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-3">¿Cómo agregar un producto nuevo?</p>
            <div className="space-y-2">
              <Step n="1">Ve a <strong>Almacén</strong> desde el menú.</Step>
              <Step n="2">Toca el botón <strong>"+ Nuevo producto"</strong>.</Step>
              <Step n="3">Llena el nombre del producto, precio de venta, categoría y cuántos tienes en existencia.</Step>
              <Step n="4">Si tiene código de barras, escríbelo o escanéalo. Sirve para buscarlo más rápido al vender.</Step>
              <Step n="5">El <strong>"Stock mínimo"</strong> es la cantidad mínima que quieres tener. Si baja de ahí, el sistema te avisa.</Step>
              <Step n="6">Toca <strong>"Guardar"</strong>. Ya aparece en el sistema.</Step>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5"><Tag size={13} /> Categorías</p>
              <p className="text-slate-500 mt-0.5">Agrupa tus productos (Lácteos, Bebidas, Limpieza, etc.) para encontrarlos más fácil.</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5"><Barcode size={13} /> Código de barras</p>
              <p className="text-slate-500 mt-0.5">Si lo tienes, el cajero puede escanearlo con la cámara del celular y agrega el producto solo.</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5"><Hash size={13} /> Tipo de unidad</p>
              <p className="text-slate-500 mt-0.5">"Pieza" para productos normales. "kg" para productos que vendes por peso (granel).</p>
            </div>
          </div>

          <Good>Puedes buscar cualquier producto escribiendo su nombre en la barra de búsqueda. No necesitas recordar dónde está.</Good>
          <Tip>Si un producto ya no lo vendes, no lo borres — mejor ponlo como "inactivo". Así conservas el historial de ventas.</Tip>
        </Section>

        {/* ─── REABASTECIMIENTO ───────────────────────────────── */}
        <Section icon={Truck} color="green" title="Reabastecimiento" subtitle="Registra cuando llega mercancía de tus proveedores">
          <p className="text-sm text-slate-600 leading-relaxed">
            Cuando llega un proveedor y te trae mercancía, usas esta sección para registrar
            qué llegó y en qué cantidad. El sistema suma automáticamente esa cantidad al inventario.
          </p>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-3">¿Cómo registrar una entrada de mercancía?</p>
            <div className="space-y-2">
              <Step n="1">Ve a <strong>Reabastecimiento</strong> desde el menú (ícono de camión).</Step>
              <Step n="2">Toca <strong>"Nuevo pedido"</strong>.</Step>
              <Step n="3">Escribe el nombre del proveedor (ej. "Bimbo", "Lala", "Mayorista del centro").</Step>
              <Step n="4">Agrega cada producto que llegó: búscalo, escribe cuántas piezas entraron y el costo por unidad.</Step>
              <Step n="5">Toca <strong>"Guardar pedido"</strong>. El stock de cada producto aumenta solo.</Step>
            </div>
          </div>

          <Tip>El campo "costo por unidad" es opcional, pero si lo llenas, el sistema puede calcular cuánto ganas por cada producto en el Panel del Dueño.</Tip>
          <Good>No tienes que actualizar el inventario a mano — el reabastecimiento lo hace solo por ti.</Good>
        </Section>

        {/* ─── CORTE DE CAJA ──────────────────────────────────── */}
        <Section icon={Scissors} color="purple" title="Corte de Caja" subtitle="El resumen del día — cuánto se vendió y cómo">
          <p className="text-sm text-slate-600 leading-relaxed">
            El <strong>Corte de Caja</strong> es como sacar cuentas al final del día.
            Te muestra exactamente cuánto dinero entró, separado por forma de pago,
            y quién lo vendió.
          </p>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-3">¿Qué información muestra?</p>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Total del día:</strong> suma de todas las ventas.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Por forma de pago:</strong> cuánto fue en efectivo, tarjeta y transferencia.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Por cajero:</strong> cuánto vendió cada empleado en su turno.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Inventario actual:</strong> una foto de cuánto tienes en existencia al cierre del día.</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">¿Cómo hacer el corte?</p>
            <div className="space-y-2">
              <Step n="1">Ve a <strong>Corte de Caja</strong> desde el menú (ícono de tijeras).</Step>
              <Step n="2">Puedes ver el corte del día de hoy o de cualquier día anterior usando el selector de fecha.</Step>
              <Step n="3">Para imprimir o guardar, usa la opción de imprimir del navegador (Ctrl+P).</Step>
            </div>
          </div>

          <Tip>Haz el corte todos los días antes de cerrar. Así siempre sabrás si el dinero en caja cuadra con lo que vendiste.</Tip>
          <Warning>Si una sesión de caja quedó abierta del día anterior, el sistema la cierra automáticamente. Siempre es mejor cerrarla tú mismo al terminar tu turno.</Warning>
        </Section>

        {/* ─── REPORTES ───────────────────────────────────────── */}
        <Section icon={BarChart2} color="teal" title="Reportes" subtitle="Analiza tus ventas del día con gráficas y estadísticas">
          <p className="text-sm text-slate-600 leading-relaxed">
            Los <strong>Reportes</strong> te dan una visión rápida de cómo va el negocio hoy.
            Puedes ver a qué hora vendes más, qué productos se venden mejor y cuánto has ganado.
          </p>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">¿Qué hay en los reportes?</p>
            <div className="space-y-3">
              <div className="bg-teal-50 rounded-xl p-3 text-sm">
                <p className="font-semibold text-teal-800">📈 Resumen del día</p>
                <p className="text-teal-700 mt-0.5">Número de ventas, total en dinero, y cuánto fue en efectivo/tarjeta/transferencia.</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-3 text-sm">
                <p className="font-semibold text-teal-800">🏆 Productos más vendidos</p>
                <p className="text-teal-700 mt-0.5">Los 10 productos que más se movieron hoy. Sirve para saber qué no debe faltarte.</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-3 text-sm">
                <p className="font-semibold text-teal-800">🕐 Ventas por hora</p>
                <p className="text-teal-700 mt-0.5">A qué horas tienes más clientes. Útil para saber cuándo necesitas más personal.</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-3 text-sm">
                <p className="font-semibold text-teal-800">📦 Estado del inventario</p>
                <p className="text-teal-700 mt-0.5">Qué productos están agotados o por agotarse. Aparecen en rojo para que los reabastecas.</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-3 text-sm">
                <p className="font-semibold text-teal-800">💳 Ventas con tarjeta</p>
                <p className="text-teal-700 mt-0.5">Lista de ventas con tarjeta, con sus comisiones. Para revisar que la terminal cobró bien.</p>
              </div>
            </div>
          </div>

          <Tip>Puedes ver reportes de días anteriores cambiando la fecha en la parte superior. Muy útil para comparar semanas.</Tip>
        </Section>

        {/* ─── CADUCIDADES ────────────────────────────────────── */}
        <Section icon={Archive} color="red" title="Caducidades" subtitle="Controla las fechas de vencimiento de tus productos">
          <p className="text-sm text-slate-600 leading-relaxed">
            En el <strong>Almacén</strong>, cada producto tiene un botón de calendario
            (📅) para registrar sus fechas de caducidad. Esto te ayuda a saber qué
            productos van a vencerse pronto para que los vendas primero.
          </p>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-3">¿Cómo registrar una caducidad?</p>
            <div className="space-y-2">
              <Step n="1">Ve a <strong>Almacén</strong> y busca el producto.</Step>
              <Step n="2">Toca el ícono de calendario (📅) que aparece junto al producto.</Step>
              <Step n="3">Escribe la fecha de caducidad y la cantidad de ese lote.</Step>
              <Step n="4">Toca <strong>"Agregar caducidad"</strong>.</Step>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">¿Qué significan los colores?</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Caducado</span>
                <span className="text-sm text-slate-600">Ya venció — retíralo del anaquel.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Caduca en X días</span>
                <span className="text-sm text-slate-600">Vence muy pronto — véndelo primero.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Vigente</span>
                <span className="text-sm text-slate-600">Está bien, tienes tiempo.</span>
              </div>
            </div>
          </div>

          <Warning>Los productos caducados aparecen en rojo en la sección de Reportes (inventario). Retíralos de la venta para evitar problemas.</Warning>
        </Section>

        {/* ─── PANEL DEL DUEÑO ────────────────────────────────── */}
        <Section icon={KeyRound} color="slate" title="Panel del Dueño" subtitle="Sección privada con contraseña — finanzas completas del negocio">
          <p className="text-sm text-slate-600 leading-relaxed">
            El <strong>Panel del Dueño</strong> es una sección privada protegida con un PIN
            (contraseña numérica). Solo el dueño la conoce. Aquí están las herramientas
            para llevar las finanzas del negocio.
          </p>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">¿Cómo entrar?</p>
            <div className="space-y-2">
              <Step n="1">Toca <strong>"Panel del Dueño"</strong> en el menú (ícono de llave 🔑).</Step>
              <Step n="2">Escribe el PIN. El PIN por defecto es <strong>1234</strong>. Cámbialo en la pestaña "Config".</Step>
              <Step n="3">Una vez adentro, tienes 6 pestañas. Descríbelas abajo.</Step>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5"><TrendingUp size={13} /> Resumen</p>
              <p className="text-slate-500 mt-0.5">
                El resumen financiero del mes (o el período que elijas): ingresos totales, costo de mercancía,
                ganancia bruta, gastos, sueldos y la <strong>utilidad neta</strong> (lo que te queda de ganancia real).
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5"><TrendingUp size={13} /> Ganancias</p>
              <p className="text-slate-500 mt-0.5">
                Tabla día por día: cuánto vendiste, cuánto costó la mercancía y cuánto ganaste. El margen % te dice qué tan rentable fue cada día.
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5"><Users size={13} /> Nómina</p>
              <p className="text-slate-500 mt-0.5">
                Registra a tus empleados (nombre, puesto, sueldo semanal o quincenal).
                Cuando les pagues, toca "Pagar" y queda guardado con fecha. El historial de pagos siempre está disponible.
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5"><Receipt size={13} /> Gastos</p>
              <p className="text-slate-500 mt-0.5">
                Anota los gastos del negocio: renta, luz, agua, transporte, limpieza, etc.
                Al final del mes, el sistema los resta de tus ganancias para darte la utilidad real.
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5"><Calculator size={13} /> Costeo</p>
              <p className="text-slate-500 mt-0.5">
                Aquí registras cuánto te cuesta cada producto (precio que le pagas al proveedor).
                El sistema calcula automáticamente el margen de ganancia. Verde = buen margen, Rojo = estás ganando poco.
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5"><KeyRound size={13} /> Config</p>
              <p className="text-slate-500 mt-0.5">
                Cambia tu PIN. También puedes cerrar sesión del panel del dueño para que nadie más entre.
              </p>
            </div>
          </div>

          <Tip>El filtro de fechas (Este mes / Mes anterior / Últimos 7 días) aplica para el Resumen, Ganancias y Gastos al mismo tiempo. Solo cámbialo una vez.</Tip>
          <Warning>Cambia el PIN 1234 lo antes posible por uno que solo tú conozcas. Ve a Panel del Dueño → Config → Cambiar PIN.</Warning>
        </Section>

        {/* ─── FAQ ────────────────────────────────────────────── */}
        <Section icon={Lightbulb} color="orange" title="Preguntas frecuentes" subtitle="Las dudas más comunes resueltas">

          <div className="space-y-4">

            <div>
              <p className="text-sm font-bold text-slate-700">¿Qué pasa si me equivoco al cobrar?</p>
              <p className="text-sm text-slate-500 mt-1">Por el momento las ventas no se pueden cancelar directamente. Si hubo un error de monto, anótalo como un gasto en el Panel del Dueño con la categoría "Otros" y la descripción "Corrección de venta". En una próxima versión se podrán cancelar ventas.</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-sm font-bold text-slate-700">¿El sistema funciona sin internet?</p>
              <p className="text-sm text-slate-500 mt-1">Sí. AbarroTech funciona en tu red local (WiFi de la tienda). Varios celulares o tablets pueden conectarse al mismo tiempo. Solo necesitas internet cuando Railway actualiza la aplicación.</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-sm font-bold text-slate-700">¿Se pueden conectar varios dispositivos a la vez?</p>
              <p className="text-sm text-slate-500 mt-1">Sí. El cajero puede usar un celular, el encargado puede ver los reportes en una tablet y el dueño puede entrar desde otra computadora, todo al mismo tiempo.</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-sm font-bold text-slate-700">¿Dónde se guarda la información?</p>
              <p className="text-sm text-slate-500 mt-1">Todo se guarda automáticamente en la nube (Railway). No pierdes datos aunque se apague la computadora o el celular.</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-sm font-bold text-slate-700">¿Cómo sé si un producto está agotado?</p>
              <p className="text-sm text-slate-500 mt-1">En Almacén, los productos con stock en cero aparecen en rojo. También en Reportes → Inventario hay una sección de "Productos agotados" y "Stock bajo".</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-sm font-bold text-slate-700">¿Qué es el "stock mínimo"?</p>
              <p className="text-sm text-slate-500 mt-1">Es la cantidad mínima que quieres tener. Ejemplo: si pones stock mínimo = 5 en el agua, cuando te queden 5 o menos el sistema te avisa en color naranja para que las pidas. Así nunca te quedas sin existencias sin darte cuenta.</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-sm font-bold text-slate-700">¿Puedo usar la app en el celular?</p>
              <p className="text-sm text-slate-500 mt-1">Sí. La aplicación está diseñada para funcionar tanto en computadora como en celular o tablet. En celular, el menú aparece en la parte de abajo de la pantalla.</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-sm font-bold text-slate-700">¿La comisión de tarjeta se le cobra al cliente o se descuenta de mi ganancia?</p>
              <p className="text-sm text-slate-500 mt-1">Depende de cómo lo configures. Si activas la comisión al cobrar con tarjeta, el sistema suma ese porcentaje al total que paga el cliente. En el Panel del Dueño puedes ver cuánto pagaste en total por comisiones de tarjeta en el mes.</p>
            </div>

          </div>
        </Section>

      </div>

      {/* Footer */}
      <div className="text-center mt-8 pb-4">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
          <Star size={16} className="text-brand-500" />
          <p className="text-sm text-brand-700">
            <strong>¿Tienes más dudas?</strong> Muéstrale esta guía a tu equipo para que todos usen el sistema igual.
          </p>
        </div>
      </div>
    </div>
  );
}

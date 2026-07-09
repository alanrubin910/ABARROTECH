import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DesktopSidebar, MobileBottomNav } from './components/Sidebar.jsx';
import POS from './pages/POS.jsx';
import Almacen from './pages/Almacen.jsx';
import Reabastecimiento from './pages/Reabastecimiento.jsx';
import CorteDeCaja from './pages/CorteDeCaja.jsx';
import Reportes from './pages/Reportes.jsx';
import Owner from './pages/Owner.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-orange-50">
        <DesktopSidebar />
        {/* pb-16 en móvil para dejar espacio a la barra inferior */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Routes>
            <Route path="/" element={<Navigate to="/pos" replace />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/almacen" element={<Almacen />} />
            <Route path="/reabastecimiento" element={<Reabastecimiento />} />
            <Route path="/corte" element={<CorteDeCaja />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/owner" element={<Owner />} />
          </Routes>
        </main>
        <MobileBottomNav />
      </div>
    </BrowserRouter>
  );
}

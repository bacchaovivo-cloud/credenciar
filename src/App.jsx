import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import PageTransitions from './components/PageTransitions';

// Lazy loading das páginas para melhor performance inicial
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardEvento = lazy(() => import('./pages/DashboardEvento'));
const Convidados = lazy(() => import('./pages/Convidados'));
const Sorteio = lazy(() => import('./pages/Sorteio'));
const Comprar = lazy(() => import('./pages/Comprar'));
const Totem = lazy(() => import('./pages/Totem'));
const Eventos = lazy(() => import('./pages/Eventos'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const LabelDesigner = lazy(() => import('./pages/LabelDesigner'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Kiosk = lazy(() => import('./pages/Kiosk'));
const WelcomeVIP = lazy(() => import('./pages/WelcomeVIP'));
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'));

const ProtectedRoute = ({ children, allowedRoles }) => {
  const role = localStorage.getItem('userRole');
  if (!role) return <Navigate to="/" />;
  
  const safeRole = role.trim().toUpperCase();
  
  // Se não houver roles específicos exigidos, basta estar logado
  if (!allowedRoles) return children;

  if (!allowedRoles.includes(safeRole)) {
    // Redireciona para a home ou convidados se não tiver permissão
    return <Navigate to="/convidados" />;
  }
  
  return children;
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransitions><Login /></PageTransitions>} />
        
        {/* Rota Pública de Venda de Ingresso */}
        <Route path="/comprar" element={<PageTransitions><Comprar /></PageTransitions>} />
        
        {/* Rota do Painel (ADMIN / MANAGER) */}
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><PageTransitions><Dashboard /></PageTransitions></ProtectedRoute>} />
        <Route path="/dashboard/:eventoId" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><PageTransitions><DashboardEvento /></PageTransitions></ProtectedRoute>} />
        <Route path="/executive" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><PageTransitions><ExecutiveDashboard /></PageTransitions></ProtectedRoute>} />
        
        {/* Rota de Lista/Check-in (TODOS LOGADOS) */}
        <Route path="/convidados" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'HOSTESS', 'STAFF']}><PageTransitions><Convidados /></PageTransitions></ProtectedRoute>} />

        {/* Rota do Sorteio Cassino (ADMIN / MANAGER) */}
        <Route path="/sorteios" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><PageTransitions><Sorteio /></PageTransitions></ProtectedRoute>} />
        <Route path="/sorteios/:eventoId" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><PageTransitions><Sorteio /></PageTransitions></ProtectedRoute>} />

        {/* Rota Autoatendimento Totem (ADMIN / MANAGER / HOSTESS) */}
        <Route path="/totem" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'HOSTESS']}><PageTransitions><Totem /></PageTransitions></ProtectedRoute>} />
        <Route path="/totem/:eventoId" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'HOSTESS']}><PageTransitions><Totem /></PageTransitions></ProtectedRoute>} />

        {/* Rotas de Administração Adicionais (SÓ ADMIN) */}
        <Route path="/eventos" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><PageTransitions><Eventos /></PageTransitions></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute allowedRoles={['ADMIN']}><PageTransitions><Usuarios /></PageTransitions></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><PageTransitions><AuditLogs /></PageTransitions></ProtectedRoute>} />
        <Route path="/label-designer/:eventoId" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><PageTransitions><LabelDesigner /></PageTransitions></ProtectedRoute>} />
        <Route path="/kiosk/:eventoId" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'HOSTESS']}><PageTransitions><Kiosk /></PageTransitions></ProtectedRoute>} />
        <Route path="/welcome/:eventoId" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'HOSTESS']}><PageTransitions><WelcomeVIP /></PageTransitions></ProtectedRoute>} />

        {/* Rota de segurança genérica */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    // Carrega o tema inicial (Light/Dark)
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }

    // [ENTERPRISE] Dynamic Theme Engine
    const updateTheme = () => {
      const activeEventJSON = localStorage.getItem('activeEventData');
      if (activeEventJSON) {
        try {
          const event = JSON.parse(activeEventJSON);
          const color = event.cor_primaria || '#0ea5e9';
          document.documentElement.style.setProperty('--p-color', color);
          // Gera um glow suave (30% de opacidade)
          document.documentElement.style.setProperty('--p-glow', `${color}4D`); 
        } catch (e) {}
      } else {
        // Fallback para Bacch Blue
        document.documentElement.style.setProperty('--p-color', '#0ea5e9');
        document.documentElement.style.setProperty('--p-glow', '#0ea5e94D');
      }
    };

    updateTheme();
    // Escuta mudanças de evento (via custom event ou storage)
    window.addEventListener('storage', updateTheme);
    window.addEventListener('themeChange', updateTheme);
    
    return () => {
      window.removeEventListener('storage', updateTheme);
      window.removeEventListener('themeChange', updateTheme);
    };
  }, []);

  return (
    <AppProvider>
      <ToastProvider>
        <Router>
          <Suspense fallback={
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Iniciando Sistema...</span>
              </div>
            </div>
          }>
            <AnimatedRoutes />
          </Suspense>
        </Router>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
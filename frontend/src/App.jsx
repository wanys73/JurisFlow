import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { CabinetSettingsProvider } from './context/CabinetSettingsContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ConfirmEmail from './pages/ConfirmEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Dossiers from './pages/Dossiers';
import DossierDetail from './pages/DossierDetail';
import Facturation from './pages/Facturation';
import FactureDetail from './pages/FactureDetail';
import Clients from './pages/Clients';
import Documents from './pages/Documents';
import Agenda from './pages/Agenda';
import Statistiques from './pages/Statistiques';
import Parametres from './pages/Parametres';
import IA_Studio from './pages/IA_Studio';

// Composant pour protéger les routes
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Composant pour les routes publiques (rediriger si connecté)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <CabinetSettingsProvider>
            <Routes>
            {/* Routes publiques */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          <Route 
            path="/auth/confirm/:token" 
            element={<ConfirmEmail />} 
          />
          <Route 
            path="/forgot-password" 
            element={<ForgotPassword />} 
          />
          <Route 
            path="/reset-password/:token" 
            element={<ResetPassword />} 
          />
          
          {/* Routes protégées */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dossiers" 
            element={
              <ProtectedRoute>
                <Dossiers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dossiers/:id" 
            element={
              <ProtectedRoute>
                <DossierDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/facturation" 
            element={
              <ProtectedRoute>
                <Facturation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/factures/:id" 
            element={
              <ProtectedRoute>
                <FactureDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clients" 
            element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/documents" 
            element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ia-studio" 
            element={
              <ProtectedRoute>
                <IA_Studio />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/agenda" 
            element={
              <ProtectedRoute>
                <Agenda />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/statistiques" 
            element={
              <ProtectedRoute>
                <Statistiques />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/parametres" 
            element={
              <ProtectedRoute>
                <Parametres />
              </ProtectedRoute>
            } 
          />
          
          {/* Redirection par défaut */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          
          {/* 404 */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-secondary-900 mb-4">404</h1>
                  <p className="text-secondary-600">Page non trouvée</p>
                </div>
              </div>
            } 
          />
            </Routes>
          </CabinetSettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;


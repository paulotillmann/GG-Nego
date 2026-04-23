import React, { useState } from 'react';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import SplashScreen from './src/components/SplashScreen';
import LoginScreen from './src/pages/LoginScreen';
import RegisterScreen from './src/pages/RegisterScreen';
import DashboardLayout from './src/layouts/DashboardLayout';
import Dashboard from './src/pages/Dashboard';

type AuthView = 'login' | 'register';

// ─── Inner App ────────────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const { session, loading, profileLoaded, signOut } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [showSplash, setShowSplash] = useState(true);

  // 1. Se ainda estiver carregando a auth, não mostramos nada (ou um loader mínimo) para não piscar a splash
  if (loading) {
    return null;
  }

  // 2. Se estiver logado, ignora a splash e vai direto pro dashboard
  if (session) {
    if (!profileLoaded) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Carregando perfil...</p>
          </div>
        </div>
      );
    }
    return (
      <DashboardLayout onLogout={signOut}>
        <Dashboard />
      </DashboardLayout>
    );
  }

  // 3. Não autenticado → mostra splash e depois login ou registro
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (authView === 'register') {
    return <RegisterScreen onBack={() => setAuthView('login')} />;
  }

  return <LoginScreen onRegister={() => setAuthView('register')} />;
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <div className="antialiased text-slate-900 dark:text-slate-50 min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </div>
);

export default App;

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sand flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-brown-dark border-t-gold rounded-full animate-spin"></div>
        <p className="mt-4 font-western text-xl text-brown-dark">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated && location.pathname !== '/') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

import { useEffect } from 'react';
import { LoginScreen } from '../components/auth/LoginScreen';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function IndexPage() {
  const { isAuthenticated, setLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate auth check
    setLoading(false);
    if (isAuthenticated) {
      navigate('/menu');
    }
  }, [isAuthenticated, navigate, setLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#d4a855] overflow-hidden relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      <LoginScreen />
    </div>
  );
}

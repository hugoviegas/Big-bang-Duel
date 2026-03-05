import { useEffect } from 'react';
import { LoginScreen } from '../components/auth/LoginScreen';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function IndexPage() {
  const { isAuthenticated, setLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(false);
    if (isAuthenticated) {
      navigate('/menu');
    }
  }, [isAuthenticated, navigate, setLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/assets/ui/bg_desert_portrait.png')] md:bg-[url('/assets/ui/bg_desert_landscape.png')] bg-cover bg-center relative overflow-hidden">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
      
      {/* Dust particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="dust-particle absolute rounded-full bg-sand/50 pointer-events-none"
          style={{
            width: `${3 + Math.random() * 4}px`,
            height: `${3 + Math.random() * 4}px`,
            left: `${10 + Math.random() * 80}%`,
            bottom: `${Math.random() * 30}%`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}

      <div className="relative z-10">
        <LoginScreen />
      </div>
    </div>
  );
}

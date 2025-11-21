import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StagHero, StagCloser } from '@/components/landing';
import { useAuthStore } from '@/stores/authStore';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen">
      <StagHero />
      <StagCloser />
    </div>
  );
};

export default Index;

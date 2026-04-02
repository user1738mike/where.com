import { Navigate } from 'react-router-dom';
import { useAuthGuard } from '@/hooks/useAuthGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  require: 'completed' | 'incomplete' | 'unauthenticated';
}

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-where-coral border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children, require }: ProtectedRouteProps) => {
  const { user, profileCompleted, loading } = useAuthGuard();

  if (loading) return <LoadingSpinner />;

  if (require === 'unauthenticated') {
    if (!user) return <>{children}</>;
    // User is authenticated — redirect based on profile status
    if (profileCompleted) return <Navigate to="/vibez/where/dashboard" replace />;
    return <Navigate to="/vibez/where/register" replace />;
  }

  if (require === 'incomplete') {
    if (!user) return <Navigate to="/vibez/where/login" replace />;
    if (profileCompleted) return <Navigate to="/vibez/where/dashboard" replace />;
    return <>{children}</>;
  }

  if (require === 'completed') {
    if (!user) return <Navigate to="/vibez/where/login" replace />;
    if (!profileCompleted) return <Navigate to="/vibez/where/register" replace />;
    return <>{children}</>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

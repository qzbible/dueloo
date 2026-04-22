import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);
  const { setUser } = useAuthStore();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        navigate('/');
        return;
      }

      try {
        const response = await axios.post(
          `${BACKEND_URL}/api/auth/session?session_id=${sessionId}`,
          {},
          { withCredentials: true }
        );

        setUser(response.data);
        
        // Restore intended path if it exists
        const intendedPath = sessionStorage.getItem('intended_path');
        if (intendedPath) {
          sessionStorage.removeItem('intended_path');
          navigate(intendedPath, { replace: true });
        } else {
          navigate('/dashboard', { replace: true, state: { user: response.data } });
        }
      } catch (error) {
        console.error('Erreur d\'authentification:', error);
        sessionStorage.removeItem('intended_path');
        navigate('/');
      }
    };

    processAuth();
  }, [location, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Connexion en cours...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

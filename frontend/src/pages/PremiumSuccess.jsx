import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Confetti from 'react-confetti';
import { useAuthStore } from '@/stores/authStore';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const PremiumSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { setUser } = useAuthStore();
  const [status, setStatus] = useState('checking');
  const hasPolled = useRef(false);

  useEffect(() => {
    if (!sessionId || hasPolled.current) return;
    hasPolled.current = true;
    
    pollPaymentStatus();
  }, [sessionId]);

  const pollPaymentStatus = async (attempts = 0) => {
    const maxAttempts = 8;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setStatus('timeout');
      return;
    }

    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/premium/status/${sessionId}`,
        { withCredentials: true }
      );

      if (response.data.status === 'paid' || response.data.payment_status === 'paid') {
        setStatus('success');
        
        const userResponse = await axios.get(`${BACKEND_URL}/api/auth/me`, { withCredentials: true });
        setUser(userResponse.data);
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else if (response.data.status === 'expired') {
        setStatus('expired');
      } else {
        setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
      }
    } catch (error) {
      console.error('Erreur vérification paiement:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      {status === 'success' && <Confetti recycle={false} numberOfPieces={500} />}
      
      <div className="text-center px-4">
        {status === 'checking' && (
          <>
            <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Vérification du paiement...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Paiement réussi !</h2>
            <p className="text-blue-200">Vous êtes maintenant Premium. Redirection...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Erreur</h2>
            <p className="text-blue-200 mb-6">Une erreur s'est produite lors de la vérification</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"
            >
              Retour au tableau de bord
            </button>
          </>
        )}
        
        {status === 'timeout' && (
          <>
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Vérification en cours</h2>
            <p className="text-blue-200 mb-6">Le paiement prend plus de temps que prévu. Vérifiez votre email.</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"
            >
              Retour au tableau de bord
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PremiumSuccess;

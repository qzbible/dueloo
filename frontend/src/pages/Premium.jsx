import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Crown, Check, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Premium = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async (packageId) => {
    setLoading(true);
    try {
      const originUrl = window.location.origin;
      const response = await axios.post(
        `${BACKEND_URL}/api/premium/checkout`,
        {
          package_id: packageId,
          origin_url: originUrl
        },
        { withCredentials: true }
      );

      window.location.href = response.data.url;
    } catch (error) {
      console.error('Erreur lors de l\'achat:', error);
      alert('Erreur lors de la création de la session de paiement');
      setLoading(false);
    }
  };

  const packages = [
    {
      id: '1h',
      name: 'Pass 1 Heure',
      price: 2.99,
      duration: '1 heure',
      features: [
        'Accès illimité pendant 1h',
        'Vies illimitées',
        'Explications détaillées',
        'Parfait pour événements'
      ],
      color: 'from-blue-400 to-blue-600'
    },
    {
      id: '24h',
      name: 'Pass 24 Heures',
      price: 9.99,
      duration: '24 heures',
      features: [
        'Accès illimité pendant 24h',
        'Vies illimitées',
        'Explications détaillées',
        'Mode hors-ligne',
        'Idéal pour défis en famille'
      ],
      color: 'from-yellow-400 to-yellow-600',
      popular: true
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4">
            <Crown className="w-4 h-4 text-yellow-300" />
            <span className="text-sm text-yellow-100 font-medium">Devenez Premium</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
            Accès Premium
          </h1>
          <p className="text-lg text-blue-200 max-w-2xl mx-auto" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Débloquez tout le potentiel de BibleQuest avec nos pass horaires
          </p>
        </motion.div>

        {user?.is_premium && user?.premium_expires_at && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto mb-8"
          >
            <Card className="p-6 bg-gradient-to-r from-yellow-400 to-yellow-600 border-0 text-center">
              <Crown className="w-12 h-12 text-gray-900 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Vous êtes Premium !</h3>
              <p className="text-gray-800">
                Expire le {new Date(user.premium_expires_at).toLocaleString('fr-FR')}
              </p>
            </Card>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-8 bg-white/10 backdrop-blur-md border-white/20 relative overflow-hidden h-full ${
                pkg.popular ? 'ring-2 ring-yellow-400' : ''
              }`}>
                {pkg.popular && (
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 text-xs font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Populaire
                  </div>
                )}

                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${pkg.color} flex items-center justify-center mb-4`}>
                  <Crown className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {pkg.name}
                </h3>
                <p className="text-blue-200 mb-4">{pkg.duration}</p>

                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">${pkg.price}</span>
                  <span className="text-blue-200 ml-2">USD</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-blue-100">
                      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  data-testid={`purchase-${pkg.id}-button`}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={loading}
                  className={`w-full bg-gradient-to-r ${pkg.color} text-white hover:opacity-90 font-bold py-6`}
                >
                  {loading ? 'Chargement...' : `Acheter ${pkg.name}`}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12 text-blue-200"
        >
          <p className="text-sm">Paiement sécurisé via Stripe</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Premium;

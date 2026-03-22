# BibleQuest 📖✨

Une plateforme gamifiée d'édification chrétienne moderne qui transforme l'apprentissage biblique en une aventure captivante.

## 🎮 Fonctionnalités MVP

### Mode Solo - Campagne Biblique
- **Parcours progressif** : Traversez la Bible de la Genèse à l'Apocalypse
- **Livres débloqués** : Genèse, Exode, Matthieu, Jean (avec plus à venir)
- **Questions variées** : Quiz bibliques avec explications détaillées
- **Système de progression** : Gagnez de l'XP, montez de niveau et déverrouillez du contenu

### Système de Badges & Niveaux
- **4 badges initiaux** : 
  - 🌱 Néophyte (5 premières leçons)
  - 🐑 Berger (Niveau 10)
  - 📜 Lévite (Niveau 25)
  - ⭐ Apôtre (Niveau 50)
- **Système d'XP** : 10 XP par bonne réponse, paliers de 100 XP par niveau
- **Vies & Pièces** : Ressources pour progresser et débloquer du contenu

### La Manne Quotidienne 🍞
- **Défi quotidien** : Une question rapide chaque jour
- **Récompenses** : 10 pièces pour une bonne réponse, 5 pour une tentative
- **Série de jours** : Maintenez votre série pour des bonus

### Premium Pass ⚡
- **Pass 1 Heure** ($2.99) : Parfait pour événements/séminaires
  - Vies illimitées pendant 1h
  - Explications détaillées
  - Accès complet aux quiz experts
  
- **Pass 24 Heures** ($9.99) : Idéal pour défis en famille
  - Vies illimitées pendant 24h
  - Explications détaillées
  - Mode hors-ligne
  - Tous les bonus Premium

### Authentification
- **Google OAuth** via Emergent (simple et sécurisé)
- **Sessions persistantes** (7 jours)
- **Protection des données utilisateur**

## 🎨 Design

### Aesthetic "Royal Glass"
- **Glassmorphism moderne** : Cartes translucides avec backdrop-blur
- **Palette spirituelle** :
  - Royal Blue (#1E3A8A) : Sagesse et profondeur
  - Gold (#D97706) : Victoire et récompenses
  - Emerald Green : Croissance spirituelle
- **Typographie distinctive** :
  - Fraunces (headings) : Caractère et élégance
  - Manrope (body) : Lisibilité moderne

### Animations & Interactions
- **Framer Motion** : Animations fluides et satisfaisantes
- **Feedback immédiat** : Confettis pour victoires, transitions douces
- **Micro-interactions** : Hover states, scales, et effets visuels
- **Path of Life** : Carte de campagne verticale avec progression visuelle

## 🛠 Architecture Technique

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py          # API principale avec routes
├── .env              # Configuration (MongoDB, Stripe)
└── requirements.txt  # Dépendances Python
```

**Collections MongoDB** :
- `users` : Profils utilisateurs (user_id, level, xp, lives, coins, premium)
- `user_sessions` : Sessions d'authentification (7 jours)
- `questions` : Base de questions bibliques (5 initiales)
- `badges` : Système de badges (4 initiaux)
- `user_badges` : Badges gagnés par utilisateur
- `user_progress` : Progression par livre biblique
- `payment_transactions` : Historique des achats Premium
- `daily_manna` : Suivi des défis quotidiens

**API Endpoints** :
```
POST   /api/auth/session        # Créer session après OAuth
GET    /api/auth/me             # Obtenir utilisateur actuel
POST   /api/auth/logout         # Déconnexion
GET    /api/questions/random    # Questions aléatoires (book, difficulty, limit)
POST   /api/progress/update     # Mise à jour progression
GET    /api/progress            # Obtenir progression
GET    /api/badges              # Badges de l'utilisateur
POST   /api/daily-manna         # Compléter défi quotidien
GET    /api/daily-manna/status  # Statut du défi
POST   /api/premium/checkout    # Créer session Stripe
GET    /api/premium/status/{id} # Vérifier paiement
POST   /api/webhook/stripe      # Webhook Stripe
```

### Frontend (React + Tailwind + Shadcn)
```
/app/frontend/src/
├── App.js              # Routing principal
├── stores/             # Zustand state management
│   ├── authStore.js    # État authentification
│   └── gameStore.js    # État du jeu
├── pages/              # Pages principales
│   ├── Landing.jsx     # Page d'accueil
│   ├── AuthCallback.jsx # Callback OAuth
│   ├── Dashboard.jsx   # Tableau de bord
│   ├── Campaign.jsx    # Carte de campagne
│   ├── QuizGame.jsx    # Jeu de quiz
│   ├── Premium.jsx     # Page premium
│   └── PremiumSuccess.jsx # Confirmation paiement
└── components/
    ├── ui/             # Composants Shadcn
    └── DailyMannaModal.jsx # Modal quotidien
```

**Technologies** :
- React 19 + React Router
- Zustand (state management)
- Framer Motion (animations)
- Shadcn UI + Tailwind CSS
- React Confetti (célébrations)
- Axios (HTTP requests)

## 🚀 Intégrations

### Emergent Google Auth
- OAuth Google géré par Emergent
- Pas de clés API à gérer
- Flow sécurisé avec session_token httpOnly

### Stripe Payments
- Test key : `sk_test_emergent` (déjà configuré)
- Pass horaires (1h et 24h)
- Webhook pour confirmations automatiques
- Polling frontend pour vérification immédiate

## 📊 Données Initiales

### Questions Sample (5)
1. **Genèse 1** : Combien de jours pour créer le monde ? (Réponse : 6 jours)
2. **Genèse 1** : Qu'a créé Dieu le premier jour ? (Réponse : La lumière)
3. **Exode 20** : Combien de commandements ? (Réponse : 10)
4. **Matthieu 5** : Où est le Sermon sur la Montagne ? (Réponse : Sur une montagne)
5. **Jean 3** : Quel est le verset le plus célèbre ? (Réponse : Jean 3:16)

### Badges Initiaux (4)
- 🌱 **Néophyte** : Terminer 5 leçons
- 🐑 **Berger** : Atteindre niveau 10
- 📜 **Lévite** : Atteindre niveau 25
- ⭐ **Apôtre** : Atteindre niveau 50

## 🧪 Testing

**100% de réussite** sur tous les tests :
- ✅ Backend : 10/10 endpoints fonctionnels
- ✅ Frontend : Tous les composants et flows
- ✅ Integration : Communication frontend-backend
- ✅ Auth : Emergent OAuth
- ✅ Payments : Stripe checkout

Voir `/app/test_reports/iteration_1.json` pour le rapport détaillé.

## 🎯 Prochaines Étapes (Phase 2)

### Modes de Jeu
- **Mode Duo** : Affrontez un ami en temps réel (matchmaking ou lien WhatsApp)
- **Mode Groupe** : Sessions de groupe avec code PIN (type Kahoot)

### Fonctionnalités Avancées
- **Carte de Paul** : Carte interactive des voyages de Paul
- **Mur des Lamentations** : Espace social pour prières
- **Système de parrainage** : Inviter 5 amis = badge Apôtre
- **Flashcards** : Mémorisation de versets (50 versets = badge Lévite)
- **Mode Hors-ligne** : Télécharger quiz pour jouer sans connexion

### Contenu
- Ajouter tous les 66 livres de la Bible
- Base de 500+ questions variées
- Difficulté progressive (facile → expert)
- Commentaires bibliques détaillés

### Monétisation
- Pass mensuel et annuel
- Contenu exclusif Premium
- Fonctionnalités églises/organisations

## 💡 Suggestions d'Amélioration Business

**Pour maximiser l'engagement** :
1. **Notifications push** : Rappels quotidiens pour la Manne
2. **Classement social** : Compétition amicale entre amis
3. **Partage de réussites** : Posts automatiques sur réseaux sociaux
4. **Programme d'affiliation** : Récompenses pour recommandations

**Pour augmenter les conversions Premium** :
1. **Essai gratuit 1h** : Goûter aux fonctionnalités Premium
2. **Bundle familial** : Réduction pour plusieurs utilisateurs
3. **Partenariats églises** : Licences de groupe
4. **Événements spéciaux** : Pass événements (congrès, séminaires)

## 📝 Notes Techniques

### Variables d'Environnement
- **Backend** : `MONGO_URL`, `DB_NAME`, `STRIPE_API_KEY`, `CORS_ORIGINS`, `REACT_APP_BACKEND_URL`
- **Frontend** : `REACT_APP_BACKEND_URL`
- ⚠️ **Ne jamais hardcoder** les URLs ou credentials

### Sécurité
- Sessions httpOnly cookies (SameSite=None, Secure)
- MongoDB _id exclus des réponses API (projections avec `{"_id": 0}`)
- Custom `user_id` UUID pour éviter les problèmes de sérialisation
- CORS configuré pour domaine frontend
- Prix définis côté serveur (pas de manipulation frontend)

### Performance
- Hot reload activé (backend et frontend)
- Supervisor pour gestion des services
- Queries MongoDB optimisées avec projections
- Lazy loading des composants React

---

**Créé avec ❤️ pour moderniser l'édification chrétienne** 🙏✨

Pour toute question ou amélioration, consultez la documentation technique dans `/app/backend/server.py` et `/app/frontend/src/`.

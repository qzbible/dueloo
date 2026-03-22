# 💳 Carte de Test Stripe pour BibleQuest Premium

## Mode Duo - RÉSERVÉ PREMIUM

Le Mode Duo (Le Duel des Disciples) est **EXCLUSIVEMENT disponible pour les utilisateurs Premium**.

### Limitation Gratuit vs Premium :
- **Gratuit** : 3 duels par jour maximum
- **Premium (Pass 1h)** : Duels illimités pendant 1 heure ($2.99)
- **Premium (Pass 24h)** : Duels illimités pendant 24 heures ($9.99)

---

## 🧪 CARTE DE TEST STRIPE

Pour tester les achats Premium **SANS FRAIS RÉELS**, utilisez cette carte de test :

### Numéro de carte :
```
4242 4242 4242 4242
```

### Date d'expiration :
```
N'importe quelle date FUTURE (ex: 12/25, 03/26, 12/30, etc.)
```

### CVC :
```
N'importe quel code à 3 chiffres (ex: 123, 456, 789, etc.)
```

### Code postal :
```
N'importe quel code (ex: 75001, 10001, etc.)
```

---

## ✅ Scénario de Test Complet

### Étape 1 : Créer un compte
1. Allez sur https://biblequest-preview.preview.emergentagent.com
2. Cliquez sur "Commencer l'aventure"
3. Connectez-vous avec Google (via Emergent Auth)

### Étape 2 : Tester le Mode Gratuit
1. Allez dans Dashboard → Mode Duo
2. Créez un match et notez le code ami
3. Ouvrez un nouvel onglet en navigation privée
4. Connectez-vous avec un autre compte Google
5. Rejoignez le match avec le code
6. Jouez 3 duels → Vous atteindrez la limite gratuite

### Étape 3 : Passer Premium
1. Message d'erreur : "Limite de 3 duels/jour atteinte. Passez Premium !"
2. Cliquez sur Dashboard → Devenir Premium
3. Choisissez "Pass 1 Heure" ($2.99) ou "Pass 24 Heures" ($9.99)
4. Sur la page Stripe :
   - Numéro : **4242 4242 4242 4242**
   - Date : **12/25** (ou toute date future)
   - CVC : **123**
   - Email : votre email
5. Cliquez "Payer"
6. Vous serez redirigé → "Paiement réussi !"
7. Badge "Premium" s'affiche dans le Dashboard

### Étape 4 : Profiter du Mode Duo Illimité
1. Retournez dans Mode Duo
2. Jouez autant de duels que vous voulez !
3. Système de scoring basé sur vitesse (bonus temps)
4. Barres de progression double en temps réel
5. Emojis de réaction (🙏🔥😮🕊️💪⭐)
6. Bouton "Revanche" instantané

---

## 🎮 Fonctionnalités Mode Duo Premium

### Gameplay Temps Réel :
- ⚔️ **10 questions synchronisées** par duel
- ⏱️ **15 secondes** par question
- 📊 **Scoring basé sur vitesse** : 100 pts base + bonus temps (max 200 pts/question)
- 📈 **Barres de progression live** : Voir l'adversaire avancer en temps réel
- ⚡ **Notification "Adversaire a répondu"** : Crée la pression

### Social & Engagement :
- 😀 **6 emojis de réaction** : Envoyer pendant le jeu
- 🔄 **Revanche instantanée** : Rejouer sans retour au menu
- 🏆 **Historique des duels** (Premium)
- 🎯 **Choix du thème** : "Uniquement Paraboles", "Nouveau Testament", etc. (Premium)

### Badges Duo Exclusifs :
- ⚔️ **Premier Duel** : Terminer votre premier duel
- 🛡️ **Vétéran du Duel** : 10 duels complétés
- 🕊️ **Pacificateur** : 5 matchs nuls d'affilée
- 🤝 **Fidèle Ami** : 10 duels vs même personne
- ⚡ **Éclair Divin** : Réponse correcte en <1 seconde

---

## 🔧 Architecture Technique WebSocket

### Backend (FastAPI + Socket.io) :
- **Room system** : Salles privées par match_id
- **Events** :
  - `join_duo_room` : Rejoindre la salle
  - `player_ready` : Signaler prêt
  - `submit_answer` : Soumettre réponse
  - `send_emoji` : Envoyer réaction
  - `request_rematch` : Demander revanche
- **Auto-emit** :
  - `new_question` : Question suivante
  - `round_results` : Résultats du round
  - `game_end` : Scores finaux
  - `opponent_answered` : Notification adversaire

### Frontend (React + Socket.io-client) :
- **États** : connecting, waiting, both_ready, playing, finished
- **Animations** : Framer Motion pour transitions fluides
- **Real-time** : WebSocket persistent pendant tout le match
- **Confettis** : Si victoire avec score >1000

### Collections MongoDB :
- `duo_matches` : Historique des matchs (player1, player2, scores, winner)
- `duo_quotas` : Limitation 3/jour (user_id, date, count)
- `user_achievements` : Badges débloqués

---

## 📊 Dashboard Enrichi

Nouvelles cartes rapides :
- ⚔️ **Mode Duo** : PvP temps réel
- 👥 **Mode Groupe** : Sessions PIN (type Kahoot)
- 🏆 **Classement** : Top 50 joueurs
- 🎖️ **Achievements** : 13 achievements (8 généraux + 5 Duo)

---

## 💎 Pourquoi le Mode Duo Booste la Rétention ?

1. **Compétition sociale** : Défier ses amis crée engagement
2. **Sessions courtes** : 3-5 min = parfait pour mobile
3. **Vitesse = skill** : Pas que la connaissance, la rapidité compte
4. **Revanche immédiate** : Gameplay loop addictif
5. **Premium = avantage** : Vies illimitées + choix thèmes
6. **Badges exclusifs** : Fierté et collection

---

## ✨ Prochaines Améliorations Duo

- [ ] **Matchmaking automatique** : Par niveau MMR
- [ ] **Historique détaillé** : Voir erreurs passées (Premium)
- [ ] **Thèmes de duel** : Paraboles, Miracles, Apôtres, etc. (Premium)
- [ ] **Tournois hebdomadaires** : Prize pool badges rares
- [ ] **Spectateur mode** : Regarder duels d'amis
- [ ] **Classement Duo** : Séparé du classement global

---

**Mode Duo = Moteur de Conversion Premium** 💰🚀

3 duels gratuits = Tease parfait → Limite atteinte → Frustration → Achat impulsif Pass 1h ($2.99) → Addiction → Renouvellement Pass 24h ($9.99) → Rétention long terme !

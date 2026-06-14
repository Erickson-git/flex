# FLEX — Modèle économique

> **Document 03 / Pôle Financement** · XOFIX Internationale · 2026-06-12
> *Comment FLEX gagne de l'argent, durablement, dès le marché local.*

---

## Principe directeur

FLEX repose sur une **économie circulaire de la monnaie sociale « Sparks »** :
l'utilisateur **achète** des Sparks en mobile money/FCFA → les **dépense** (cadeaux, boosts, déblocages, défis) → le créateur qui les reçoit peut les **retirer** en FCFA (moins une commission). FLEX prend une **marge à chaque étape** et ajoute des **revenus récurrents** (Premium) et **B2B** (pub, partenariats).

```
FCFA (mobile money) → achat Sparks → dépense in-app → revenu créateur → retrait FCFA
                          ▲ marge FLEX      ▲ commission FLEX        ▲ frais de retrait
```

---

## 1. Sources de revenus

### A. Vente de Sparks (cœur du modèle) — **B2C**
- L'utilisateur achète des packs de Sparks par mobile money.
- **Marge FLEX :** différence entre le prix de vente du Spark et sa valeur de reversement (ex. vendu 1 Spark = 10 FCFA, reversé 7 FCFA → 30 % de marge brute sur la circulation).
- Volume = nerf de la guerre : plus l'app est animée (cadeaux en live, défis), plus les Sparks circulent.

### B. Abonnement Premium — **B2C récurrent**
- Mensuel/annuel. **Essai gratuit 1 mois déjà codé** (`premium.ts`).
- Avantages : badge VIP, thèmes exclusifs, filtres premium, IA illimitée, boost de visibilité, plus de stockage, fonctions avancées.
- **MRR (revenu mensuel récurrent)** = la métrique reine pour les investisseurs.

### C. Commission sur cadeaux & défis — **prélèvement**
- Sur chaque cadeau envoyé en live/chat et chaque mise de défi, FLEX prélève un %.
- Déjà ancré dans l'économie (cadeaux Sparks dans Live, Challenges).

### D. Boost / mise en avant — **pay-to-reach**
- L'utilisateur paie (Sparks) pour booster une publication, un profil, un live (« spotlight »).
- Reward feature `spotlight` déjà prévue dans le code.

### E. Frais de retrait créateur — **prélèvement**
- Quand un créateur convertit ses Sparks en FCFA, FLEX prélève des frais de service.

### F. Publicité locale ciblée — **B2B (phase 2-3)**
- Espaces sponsorisés pour commerces/marques locales, format léger natif.
- Atout : ciblage géo + intérêts, audience jeune captive.

### G. Partenariats & intégrations — **B2B**
- Telcos (recharge data + Sparks), banques/fintech (mobile money), marques (défis sponsorisés), labels musique (catalogue audio). Voir doc 07.

### H. Place de marché / Market — **commission**
- Page `Market` existante : commission sur ventes entre utilisateurs (biens, services, contenus).

---

## 2. Qui paie quoi — récapitulatif

| Payeur | Quoi | Revenu FLEX |
|--------|------|-------------|
| Utilisateur | Achat de Sparks | Marge sur émission |
| Utilisateur | Abonnement Premium | Récurrent (MRR) |
| Fan | Cadeaux en live/chat | Commission |
| Joueur | Mise de défi | Commission |
| Créateur | Retrait Sparks → FCFA | Frais de service |
| Créateur/commerçant | Boost / spotlight | Vente directe |
| Marque / telco | Pub & partenariats | Contrats B2B |
| Vendeur Market | Vente entre users | Commission |

---

## 3. Pourquoi ce modèle est adapté à l'Afrique de l'Ouest

- **Mobile money natif** : pas besoin de carte bancaire (faible bancarisation).
- **Micro-paiements** : on peut vendre des Sparks à très petit ticket (100-500 FCFA).
- **Le créateur gagne sa vie** : argument d'acquisition et de rétention massif.
- **Léger** : faible coût data → accessible à tous.

---

## 4. Indicateurs clés à suivre (KPIs)

| KPI | Définition | Pourquoi |
|-----|------------|----------|
| MAU / DAU | Utilisateurs actifs mensuels/quotidiens | Taille & engagement |
| ARPU | Revenu moyen par utilisateur | Monétisation |
| ARPPU | Revenu moyen par utilisateur **payeur** | Qualité du payeur |
| Taux de payeurs | % d'utilisateurs qui achètent des Sparks/Premium | Conversion |
| MRR | Revenu Premium récurrent | Prévisibilité |
| Volume Sparks | Sparks émis/dépensés par mois | Santé de l'économie |
| CAC | Coût d'acquisition client | Efficacité marketing |
| LTV | Valeur vie client | Rentabilité (viser LTV > 3× CAC) |
| Rétention J1/J7/J30 | % qui reviennent | Product-market fit |

---

## 5. Garde-fous économiques (anti-fraude & équilibre)

- **Anti-blanchiment de Sparks** : KYC mobile money, plafonds de retrait, détection de circuits frauduleux (doc 11).
- **Équilibre émission/retrait** : surveiller que la masse de Sparks ne s'effondre pas (taux de reversement < prix de vente garanti).
- **Pas de fausse hype / faux comptes** (ligne rouge tenue dans le produit) → confiance = valeur de la monnaie.

> Les chiffrages (prix des packs, % de marge, projections) sont dans le **doc 04**.

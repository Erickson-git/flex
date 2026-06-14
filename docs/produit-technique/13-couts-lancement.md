# FLEX — Coûts des améliorations & du lancement officiel

> **Document 13 / Pôle Produit & Technique** · XOFIX Internationale · 2026-06-12
>
> ⚠️ **Ordres de grandeur** à ajuster avec devis réels. Devise : **FCFA (XOF)**.
> Repère : 1 € ≈ 656 FCFA · 1 $ ≈ 600 FCFA (à vérifier).
> Les tarifs des fournisseurs (Agora, Mux, etc.) changent — **vérifier avant d'engager**.

---

## 1. Coûts récurrents (mensuels) par phase

| Poste | Lancement (P1) | Traction (P2) | Échelle (P3) |
|-------|---------------:|--------------:|-------------:|
| Hébergement Vercel | 0 – 15 000 | 30 000 – 100 000 | 200 000+ |
| Supabase (DB/Auth/Storage/Realtime) | 0 – 20 000 | 100 000 – 300 000 | 600 000+ |
| TURN (relais appels) | 0 | 20 000 – 80 000 | 200 000+ |
| Live vidéo (Agora) | 0 (tier gratuit) | 50 000 – 200 000 | 500 000+ |
| Transcodage vidéo (Cloudinary→Mux) | 0 (tier gratuit) | 30 000 – 150 000 | 400 000+ |
| IA (LLM, traduction) | 0 – 20 000 | 50 000 – 150 000 | 300 000+ |
| SMS OTP (vérif. numéro) | 10 000 – 30 000 | 80 000 – 250 000 | 500 000+ |
| Monitoring (Sentry, analytics) | 0 – 15 000 | 30 000 – 60 000 | 100 000+ |
| Nom de domaine + e-mails pro | ~5 000 | ~10 000 | ~20 000 |
| **Total infra / mois (≈)** | **~50 000 – 120 000** | **~500 000 – 1 300 000** | **~3 000 000+** |

> En **phase lancement, l'infra peut tenir sous ~100 000 FCFA/mois** grâce aux paliers gratuits.

---

## 2. Coûts de développement des améliorations (one-shot)

> Si réalisé en interne par l'équipe salariée, c'est **inclus dans les salaires**.
> Voici l'estimation en **jours-homme** (J/H) si sous-traité (≈ 25 000 – 60 000 FCFA / J/H selon profil).

| Chantier (doc 12) | Effort (J/H) | Priorité |
|-------------------|------------:|:--------:|
| Reset mot de passe + OTP SMS | 5 – 8 | 🔴 |
| Retrait Sparks → FCFA + dashboard créateur | 12 – 20 | 🔴 |
| Algorithme de feed v1 + recherche full-text | 10 – 18 | 🔴/🟠 |
| Monitoring + analytics + sauvegardes | 4 – 7 | 🔴 |
| Reels (vidéo courte) + éditeur | 20 – 35 | 🟠 |
| Live vidéo (Agora) + cadeaux | 12 – 20 | 🟠 |
| Premium gaté + boosts payants | 8 – 14 | 🟠 |
| Chat/enregistrement appel de groupe + partage d'écran | 8 – 14 | 🟠 |
| Messagerie avancée (lu, réponses, présence) | 8 – 12 | 🟠 |
| IA agents + modération + traduction à l'échelle | 15 – 30 | 🟢 |
| AR premium + E2E DM + galerie chiffrée | 20 – 40 | 🟢 |
| Communautés/pages + multilingue + Market | 20 – 40 | 🟢 |
| **Total indicatif** | **~140 – 260 J/H** | — |

> En sous-traitance, **~140-260 J/H ≈ 3 500 000 – 15 000 000 FCFA** selon profils et périmètre. En interne (équipe), c'est étalé sur les salaires des 12-18 mois.

---

## 3. Coût du LANCEMENT OFFICIEL (one-shot + 1er mois)

| Poste | Estimation (FCFA) |
|-------|------------------:|
| Identité de marque finalisée (logo décliné, charte) | 200 000 – 800 000 |
| Site/landing + assets store (icônes, captures) | 150 000 – 500 000 |
| Campagne de lancement (ambassadeurs, influenceurs) | 3 000 000 – 10 000 000 |
| Événement(s) de lancement (Lomé) | 1 000 000 – 5 000 000 |
| Création de contenu (vidéos promo, visuels) | 500 000 – 2 000 000 |
| Publicité digitale (réseaux, mobile) | 2 000 000 – 8 000 000 |
| Juridique (statuts, marque, CGU, contrats) | 500 000 – 2 000 000 |
| Frais bancaires / mobile money / KYC | 200 000 – 800 000 |
| Réserve imprévus (10-15 %) | au prorata |
| **Total lancement (≈)** | **~8 000 000 – 30 000 000 FCFA** |

---

## 4. Budget global recommandé (12-18 mois)

| Bloc | Bas | Haut |
|------|----:|-----:|
| Infrastructure & services (12-18 mois) | 1 500 000 | 12 000 000 |
| Développement des améliorations | 3 500 000 | 15 000 000 |
| Lancement officiel + marketing | 8 000 000 | 30 000 000 |
| Salaires équipe (cf. doc 04) | 30 000 000 | 50 000 000 |
| Juridique / comptable / divers | 2 000 000 | 6 000 000 |
| **TOTAL (≈)** | **~45 000 000** | **~110 000 000 FCFA** |

> Cohérent avec la **levée pre-seed** proposée (doc 05). Le **strict minimum** pour un lancement crédible et une équipe réduite tourne autour de **40-50 M FCFA** ; un lancement ambitieux multi-pays vise le haut de la fourchette.

---

## 5. Comment dépenser intelligemment (FinOps)
1. **Rester sur les paliers gratuits** tant que possible (l'app est conçue pour).
2. **N'activer un service payant (Agora, Mux, TURN) que quand l'usage le justifie.**
3. **Mesurer le coût par utilisateur actif** chaque mois → garder la rentabilité.
4. **Privilégier le viral gratuit** (parrainage, défis, stories) au CAC payant.
5. **Internaliser le dev** plutôt que sous-traiter au prix fort, dès que possible.

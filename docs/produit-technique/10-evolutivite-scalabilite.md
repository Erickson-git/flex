# FLEX — Évolutivité : tenir à des millions d'utilisateurs

> **Document 10 / Pôle Produit & Technique** · XOFIX Internationale · 2026-06-12
> *Le plan pour passer de quelques milliers à des millions d'utilisateurs sans
> tout réécrire — robustesse, performance, coûts maîtrisés.*

---

## Principe directeur

**Scaler par phases, pas d'un coup.** L'architecture actuelle (PWA + Supabase +
Vercel + WebRTC) tient déjà des **dizaines de milliers** d'utilisateurs sans
changement majeur. On ajoute de la capacité **quand les métriques le justifient**,
pour ne pas brûler du cash en avance.

---

## Les 4 piliers : Évolutivité · Robustesse · Performance · Sécurité

### 1) Base de données (Postgres / Supabase)
| Levier | Quand | Effet |
|--------|-------|-------|
| **Index** sur les colonnes filtrées (déjà en place : username, phone, score, dates) | Maintenant | Requêtes rapides |
| **Pagination** (keyset) du feed et des listes | Dès la croissance | Évite de charger trop de lignes |
| **Connection pooling** (PgBouncer, fourni par Supabase) | Trafic concurrent | Tient plus de connexions |
| **Read replicas** | Forte charge lecture | Lecture distribuée |
| **Plan Supabase supérieur / instance dédiée** | Montée en charge | Plus de CPU/RAM/IO |
| **Partitionnement** des grosses tables (messages, notifications) par date | Très gros volume | Maintenance & perf |
| **Archivage** des données froides | Long terme | Coûts de stockage |

### 2) Temps réel (Realtime, présence, broadcast)
- Realtime Supabase tient le chat live, présence, notifications.
- À l'échelle : **limiter les canaux**, regrouper les abonnements, throttler les events (déjà fait pour le scroll).
- Live vidéo massif → **fournisseur dédié** (Agora/LiveKit), la couche sociale reste sur Realtime (cf. `docs/live-ar-architecture.md`).

### 3) Médias & stockage
- Images **déjà compressées côté client** (clé pour les faibles débits).
- À l'échelle : **CDN devant le Storage**, transcodage vidéo managé (Cloudinary → Mux), nettoyage des médias orphelins, quotas par utilisateur.
- Galerie/enregistrements d'appel : surveiller la croissance du bucket `media`.

### 4) Appels (WebRTC)
- P2P = **gratuit et scalable** par nature (pas de serveur média en 1-à-1).
- **TURN** (relais) nécessaire pour ~10-20 % des réseaux (NAT strict) → coût qui grandit avec le volume → prévoir un fournisseur TURN payant fiable à l'échelle.
- Appels de groupe en **mesh** = limité (~4-5) → passer à un **SFU** (LiveKit/Agora) pour les grandes salles.

### 5) Frontend & distribution
- **PWA + CDN Vercel** = distribution mondiale quasi infinie pour le statique.
- **Code-splitting** déjà en place (pages `lazy()`).
- Optimisations : réduire le bundle principal, précharger l'essentiel, lazy-load des médias, cache offline intelligent (Workbox).

### 6) Backend logique (Edge Functions)
- Logique sensible (push, IA, paiements) en **Edge Functions** (serverless, scalent automatiquement).
- Mettre en file/asynchrone les tâches lourdes (envoi de push en masse, modération IA) — Queues.

---

## Robustesse (ne pas tomber)

- **Dégradation propre** : si un module backend manque, l'app le signale au lieu de planter (déjà le cas pour l'admin).
- **Réessais & idempotence** : SQL idempotent (ré-exécutable), upserts, gestion d'échec côté client (brouillons restaurés en chat).
- **Monitoring & alertes** : ajouter Sentry (erreurs front), logs Supabase, alertes sur taux d'erreur, latence, quotas.
- **Sauvegardes** : backups Postgres réguliers (Supabase) + plan de restauration testé.
- **Limledebit / anti-abus** : rate limiting (Vercel WAF / BotID), captcha sur inscription si spam.

---

## Sécurité à l'échelle (détail doc 11)
- RLS partout, secrets côté serveur, audit régulier.
- Anti-fraude paiements & Sparks (KYC mobile money, plafonds).
- Conformité données personnelles (OHADA + lois locales) quand le volume grandit.

---

## Plan par paliers (capacité ↔ action)

| Palier | Utilisateurs actifs | Actions clés |
|--------|--------------------:|--------------|
| **P1 — Lancement** | 0 – 50 k | Stack actuelle. Monitoring. Compression médias. 0 € → petit budget. |
| **P2 — Traction** | 50 k – 500 k | Plan Supabase supérieur, CDN médias, TURN payant, Live Agora, pagination partout, Sentry. |
| **P3 — Échelle** | 500 k – 5 M | Read replicas / instance dédiée, transcodage Mux, SFU pour groupes, Queues, partitionnement, équipe SRE. |
| **P4 — Massif** | 5 M+ | Multi-région, sharding éventuel, CDN multi-fournisseur, caching avancé, modération IA industrialisée. |

---

## Indicateurs techniques à surveiller (SLI)
- Latence p95 des requêtes API & du feed.
- Taux d'erreur (front + backend).
- Temps de connexion d'appel & taux d'échec WebRTC.
- Taille & croissance du stockage.
- Coût par utilisateur actif (FinOps) — la métrique qui garde la rentabilité.

> **Message clé pour l'investisseur :** l'architecture est **prête à grandir par paliers** ; chaque palier de coût n'est engagé **qu'avec les revenus correspondants** → la croissance s'autofinance.

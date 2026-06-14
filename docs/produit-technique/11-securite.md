# FLEX — Sécurité

> **Document 11 / Pôle Produit & Technique** · XOFIX Internationale · 2026-06-12
> *Le modèle de sécurité de FLEX, ce qui est déjà en place, et le plan de
> durcissement. « La forteresse de sécurité » du projet.*

---

## 1. Philosophie

> **On ne fait JAMAIS confiance au client.** Tout ce qui est sensible est protégé
> côté serveur (base de données + fonctions). Le navigateur est public : tout code
> ou variable qui y vit est lisible par n'importe qui.

---

## 2. Authentification & comptes

- **Inscription rapide** : compte créé, **mot de passe + email + téléphone** définis dès l'inscription → compte récupérable partout.
- **Mots de passe** : hachés par Supabase Auth, **jamais stockés en clair**, jamais dans le code.
- **Compte invité** : exploration sans inscription, pseudo obligatoire pour publier/commenter.
- **Récupération de compte** : email + mot de passe (re-connexion multi-appareils).
- **Ghost Mode** : à la déconnexion, les traces locales des espaces éphémères (Hideouts) sont effacées.

---

## 3. Autorisation — Row Level Security (RLS)

Le **vrai verrou** de FLEX. Chaque table sensible a des règles Postgres :
- `profiles` : lecture publique, **écriture réservée à soi**.
- `saved_media` (galerie privée) : **lecture/écriture/suppression réservées au propriétaire**.
- `flexes`, `comments`, `chat_messages` : écriture par l'auteur, suppression par l'auteur.
- `app_admins` : seuls les admins listés peuvent exécuter les actions de modération.
- Correctif appliqué : `blacklist_account` n'est plus exécutable par n'importe quel compte authentifié.

> Conséquence : même si quelqu'un manipule le client, **la base refuse** ce qu'il n'a pas le droit de faire.

---

## 4. Sécurité de l'administration

- **Pas de mot de passe admin en dur** (ce serait lisible dans le bundle).
- Accès admin = **identité Supabase** dont l'`user_id` est dans la table **`app_admins`** (verrou serveur) ; le pseudo `komi` n'ouvre que l'interface (couche UX).
- Pour un vrai 2e facteur : Edge Function dédiée (chantier serveur, v2).

---

## 5. Secrets & clés

| Secret | Où il vit | Jamais où |
|--------|-----------|-----------|
| Mot de passe utilisateur | Haché dans Supabase Auth | Jamais dans le code |
| Clé `service_role` Supabase | Edge Functions (serveur) | Jamais côté client |
| Clés API (LLM, push VAPID privée) | Secrets Edge Functions | Jamais dans `VITE_*` |
| Clé publique VAPID | Bundle (OK, publique) | — |

> ⚠️ **Si un jeton d'accès personnel (PAT) Supabase a servi à configurer la base, le révoquer après usage.** De même, toute clé API collée en clair (chat, doc) doit être **régénérée**.

---

## 6. Protection des contenus

- **Verrou PIN** sur publications & **galerie privée** : empreintes **SHA-256 salées**, le code n'est jamais stocké en clair. (v1 = verrou d'affichage ; chiffrement réel du stockage = v2.)
- **Garde anti-injection** sur les contenus (filtrage de motifs malveillants).
- **Modération** : signalements + sanctions graduées (avertir → ban 24h/7j → définitif) + journal d'activité.

---

## 7. Sécurité des paiements & de l'économie

- Validation **manuelle des paiements** par l'admin (reçu mobile money) avant crédit des Sparks → barrière anti-fraude.
- À l'échelle : **KYC** via le fournisseur mobile money, **plafonds** de retrait, détection de circuits de blanchiment de Sparks, surveillance des reçus réutilisés.

---

## 8. Vie privée & conformité

- **Minimisation** : ne collecter que le nécessaire (pseudo, email, téléphone).
- **Téléphone** : visible en v1 (comme WhatsApp) → option « table privée + recherche par RPC sans exposer le numéro » prévue en v2.
- **Données partenaires** : uniquement **agrégées/anonymisées**.
- **Conformité** : aligner sur OHADA + lois locales sur les données personnelles ; rédiger **politique de confidentialité + CGU** (doc 15) ; prévoir droit d'accès/suppression.
- **Mineurs** : âge minimum dans les CGU + modération adaptée.

---

## 9. Réseau & infrastructure

- **HTTPS partout** (Vercel).
- **WebRTC chiffré** (DTLS-SRTP) de bout en bout pour les appels P2P.
- À ajouter à l'échelle : **WAF / rate limiting / anti-bot** (Vercel Firewall/BotID), captcha anti-spam à l'inscription.

---

## 10. Plan de durcissement (checklist priorisée)

**Court terme (avant/juste après lancement)**
- [ ] Révoquer les PAT/clés exposés, régénérer les clés API.
- [ ] Vérifier que TOUTES les tables ont la RLS activée et testée.
- [ ] Politique de confidentialité + CGU publiées.
- [ ] Sauvegardes Postgres automatiques + test de restauration.
- [ ] Rate limiting / anti-bot à l'inscription.

**Moyen terme (traction)**
- [ ] Monitoring (Sentry + alertes), audit de sécurité.
- [ ] Anti-fraude Sparks (plafonds, détection).
- [ ] 2FA admin via Edge Function.
- [ ] Confidentialité au niveau post (RLS) + numéro non exposé.

**Long terme (échelle)**
- [ ] Pentest externe régulier, bug bounty.
- [ ] Chiffrement réel du stockage privé (galerie) via URLs signées + RPC.
- [ ] Conformité formalisée + DPO si requis.

---

## 11. Réponse à incident (cadre)
1. **Détecter** (monitoring/alertes).
2. **Contenir** (couper l'accès compromis, révoquer les clés).
3. **Éradiquer** (corriger la faille).
4. **Restaurer** (backups).
5. **Communiquer** (utilisateurs/partenaires si données touchées).
6. **Apprendre** (post-mortem, correctif durable).

> Voir aussi : [Guide de l'administrateur](../guide-administrateur.md) et [Évolutivité](10-evolutivite-scalabilite.md).

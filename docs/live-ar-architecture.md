# FLEX — Live / AR / Transcodage : architecture & coûts (dossier de décision)

> But : choisir **avant d'écrire du code** ou d'engager un budget. Ces 3 fonctions
> ne peuvent PAS tourner sur un PWA statique + Supabase seuls : elles exigent des
> services tiers managés. On choisit selon le **budget** et l'**échelle**.
>
> ⚠️ Les tarifs ci-dessous sont des ordres de grandeur (connaissance jan‑2026).
> **Vérifie le prix actuel sur le site du fournisseur avant de t'engager** — ils changent.

---

## Contexte FLEX (ce qui guide le choix)
- Lancement **low‑budget**, audience **Lomé / Afrique de l'Ouest**.
- Beaucoup de **téléphones d'entrée de gamme** + **bande passante limitée/chère** → éviter le tout‑vidéo lourd au départ ; compresser agressivement.
- Paiements réels déjà en place (Sparks/FCFA) → les **cadeaux en live** peuvent réutiliser cette économie, sans nouveau fournisseur de paiement.
- Règle d'or : **la vidéo passe par un tiers ; la couche sociale (chat live, nb de spectateurs, cadeaux) reste sur Supabase Realtime → quasi gratuit.**

---

## 1) Live streaming

| Option | Modèle | Forces | Coût (ordre de grandeur) | Pour qui |
|---|---|---|---|---|
| **Agora** | WebRTC interactif | **Palier gratuit ~10 000 min/mois**, mature, cadeaux/co‑host | ~0,99–3,99 $/1000 min selon résolution au‑delà | ✅ **Reco lancement** : interactif + tier gratuit |
| **LiveKit Cloud** | WebRTC (SFU) | DX moderne, open‑source (auto‑hébergeable plus tard), faible latence | ~par participant‑minute ; self‑host = coût serveur only | Reco si tu veux pouvoir **auto‑héberger** ensuite |
| **Mux Live / Real‑Time** | RTMP→HLS / WebRTC | Très simple, broadcast 1→N propre | ~par minute streamée + livrée | Live **diffusion** (1 streamer, large audience) |
| **100ms / Daily** | WebRTC | Bons SDK, tiers gratuits variables | par participant‑minute | Alternatives solides |

**Reco :** démarrer sur **Agora** (palier gratuit → 0 € tant que petit) pour le live **interactif** (style TikTok Live). Migration LiveKit possible plus tard si tu veux auto‑héberger pour couper les coûts à l'échelle.

**Interactions (chat live, compteur spectateurs, cadeaux)** → **Supabase Realtime** :
- `presence` = nombre de spectateurs en direct.
- `broadcast` = messages live + événements « cadeau » (réutilise l'économie Sparks).
- Coût : inclus dans Supabase (quasi nul aux volumes de lancement).

---

## 2) Filtres / AR (beauté, manga, lumière)

| Option | Licence | Forces | Coût | Pour qui |
|---|---|---|---|---|
| **MediaPipe** (Google) | **Gratuit / open‑source** | Face mesh, segmentation, tourne **dans le navigateur** (WASM/WebGL) | **0 €** | ✅ **Reco lancement** : beauté légère, fond, shader manga maison |
| **DeepAR** | Commerciale | Filtres beauté + AR + **style anime** prêts à l'emploi, SDK web | Tier dev gratuit, puis par **MAU** | Quand le budget permet un rendu « premium » |
| **Banuba** | Commerciale | Beauté/AR haut de gamme | Sur devis (cher) | Plus tard, si AR = argument central |
| **TensorFlow.js + shaders** | Gratuit | Sur‑mesure total | 0 € mais **gros dev** | Si besoin spécifique |

**Reco :** **MediaPipe (0 €)** pour le lissage beauté + segmentation fond + un shader « manga » maison ; passer à **DeepAR** quand le budget le justifie. ⚠️ Sur téléphones faibles, garder les effets **légers** (perf).

---

## 3) Compression / transcodage vidéo

| Option | Où | Forces | Coût | Pour qui |
|---|---|---|---|---|
| **ffmpeg.wasm** | **Client** | 0 € serveur, compresse avant upload | **0 €** mais **lourd sur vieux tél** (lent) | Clips courts, budget zéro |
| **Cloudinary** | Managé | Transcodage + transfos image/vidéo, **tier gratuit** | Gratuit puis crédits | ✅ **Reco lancement** (a un tier gratuit) |
| **api.video** | Managé | Spécialiste vidéo, upload→HLS | par minute | Bon compromis |
| **Mux Video** | Managé | Le plus complet (HLS adaptatif, vignettes) | par min encodée + stockée + livrée | **Reco à l'échelle** |

**Reco :** l'**image est déjà compressée côté client** (fait dans `src/lib/upload.ts`). Pour la **vidéo** : **Cloudinary (tier gratuit)** au lancement, **Mux** à l'échelle. Éviter ffmpeg.wasm sur l'audience d'entrée de gamme (trop lent).

---

## Architecture recommandée — par phases

**Phase 1 — Lancement (0 €, faisable tout de suite)**
- **Live interactif minimal SANS vidéo tierce** : « salon live » sur **Supabase Realtime** (présence = spectateurs, broadcast = chat + cadeaux Sparks). Audio/texte en direct. *→ Brique livrable à 0 € dès maintenant si tu veux.*
- Filtres : **MediaPipe** dans la caméra du Studio (nécessite la capture caméra `getUserMedia`).
- Compression : déjà en place pour l'image.

**Phase 2 — Traction (petit budget)**
- Ajouter la **vidéo live** via **Agora** (palier gratuit), branchée sur la couche Realtime déjà construite.
- Vidéo VOD via **Cloudinary** (tier gratuit).

**Phase 3 — Échelle (budget établi)**
- **Mux** (transcodage/VOD pro), **DeepAR** (filtres premium), éventuellement **LiveKit auto‑hébergé** pour maîtriser les coûts.

---

## Décisions à prendre (par toi)
1. **Live au lancement** : (a) salon Realtime 0 € audio/chat d'abord [reco], ou (b) vidéo Agora tout de suite ?
2. **Filtres** : MediaPipe 0 € d'abord [reco], ou budget DeepAR direct ?
3. **Budget mensuel cible** pour ces fonctions ? (détermine Phase 2 vs 3.)

> Dès que tu réponds, je construis la brique correspondante. Le **salon Live Realtime (Phase 1)** est le seul morceau **à 0 € livrable immédiatement** — c'est ma reco pour continuer sans dépense.

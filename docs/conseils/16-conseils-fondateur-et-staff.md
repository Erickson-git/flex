# FLEX / XOFIX — Conseils au fondateur & au staff

> **Document 16 / Pôle Conseils** · 2026-06-12
> *Comment piloter, recruter, vendre et ne pas se tromper. Concret, direct.*

---

## PARTIE 1 — Conseils au fondateur (toi)

### Mentalité
1. **Tu as déjà fait le plus dur** : un produit complet existe et tourne. Maintenant, le jeu c'est la **distribution** (faire venir et rester les gens), pas le code.
2. **Concentre-toi sur 1 métrique à la fois.** Au lancement : la **rétention J7** (les gens reviennent-ils ?). Si oui → accélère l'acquisition. Sinon → améliore le produit d'abord.
3. **Parle à tes utilisateurs chaque semaine.** 10 vraies conversations valent mieux que 100 suppositions.
4. **Lance imparfait, vite.** Un lancement à Lomé qui marche bat un produit « parfait » jamais sorti.

### Argent
5. **Sépare l'argent perso et l'argent de XOFIX** dès maintenant (compte pro). Indispensable pour lever.
6. **Surveille le « runway »** (combien de mois de trésorerie te restent). Décide toujours en fonction de ça.
7. **Lève quand tu es en position de force** (traction qui monte), pas quand tu es à sec.
8. **Ne brade pas trop de parts trop tôt.** Garde le contrôle pour les tours suivants (cf. doc 05).

### Produit & priorités
9. **Dis NON à 90 % des idées.** La feuille de route du doc 12 est priorisée : fais le 🔴 d'abord.
10. **La monétisation locale (retrait Sparks → FCFA) est ton arme** : un créateur qui gagne de l'argent ramène 10 amis. Priorise-la.
11. **Mesure tout** (analytics) avant d'optimiser quoi que ce soit.

### Risques à éviter
12. **Ne code jamais de secret côté client** (mot de passe admin, clés). Régénère toute clé exposée. (cf. doc 11)
13. **Pas de fausse hype ni de faux comptes** : ta crédibilité = la valeur de ta monnaie.
14. **Protège ta marque (OAPI) AVANT le lancement public** (cf. doc 15), sinon un autre peut te la prendre.
15. **Fais relire tes contrats par un avocat** avant de signer (cf. doc 08).

### Sur toi-même
16. **Délègue ce qui n'est pas vital** (le panneau admin permet déjà à un modérateur de t'aider).
17. **Documente** (cette suite de docs en est la preuve) : ça te rend remplaçable sur les tâches et donc plus libre.
18. **Garde de l'énergie pour le marathon** : un réseau social se construit en années, pas en semaines.

---

## PARTIE 2 — Conseils au staff (ton équipe)

### Pour tout le monde
- **L'utilisateur d'abord.** Chaque décision se juge à : « est-ce que ça aide l'utilisateur africain ? »
- **Confidentialité sacrée.** On ne regarde, ne partage ni n'exploite jamais les données privées.
- **Rapidité honnête.** On livre vite, mais on ne ment jamais sur ce qui marche ou pas.
- **Sécurité réflexe.** Au moindre doute (clé exposée, faille), on alerte immédiatement.

### Modérateurs / Support (voir aussi le Guide admin)
- Traiter les **paiements vite** (la confiance = la vitesse de crédit).
- **Sanctions graduées** : avertir → suspendre → bannir. Documenter les cas limites.
- **Ne jamais** se faire passer pour un utilisateur ni demander son mot de passe.
- Rotation matin/soir : rien ne traîne plus de 24 h.

### Développeurs
- **Tout passe par la RLS** : on ne fait pas confiance au client.
- **SQL idempotent**, code testé, échecs gérés proprement (dégradation, pas de crash).
- **Performance d'abord pour l'entrée de gamme** : compresser, paginer, alléger.
- **Petites livraisons fréquentes**, vérifiées (build vert + test rapide).

### Growth / Community
- **Boucles virales avant pub payante** : parrainage, défis, stories, cadeaux.
- **Ambassadeurs locaux** rémunérés (cash + Sparks), objectifs clairs (KPIs).
- **Écouter la communauté** et remonter les retours produit chaque semaine.

### Commercial / Partenariats
- **Gagnant-gagnant et écrit** : NDA → pilote mesurable → contrat (doc 07-08).
- **Connaître les 3 chiffres** : audience, engagement, ce qu'on offre.
- **Protéger la marque et les données** dans chaque accord.

---

## PARTIE 3 — Rituels d'équipe recommandés
- **Lundi** : objectifs de la semaine (1 métrique cible).
- **Quotidien (15 min)** : ce qui bloque, ce qui avance.
- **Vendredi** : revue des chiffres (rétention, revenus, signalements) + démo.
- **Mensuel** : bilan financier (runway, coût/utilisateur) + sécurité.

> « Une bonne équipe, une métrique claire, et la discipline de dire non :
> c'est ça qui transforme un bon produit en grand réseau. »

# Rapports d'amélioration automatique — FLEX

Ce dossier contient les rapports générés par les scripts d'amélioration continue
(`scripts/auto_ameliore.py` et `scripts/auto_pipeline.py`).

## Deux types de fichiers

| Préfixe | Généré par | Contenu |
|---------|-----------|---------|
| `rapport_AAAA-MM-JJ_HH-MM-SS.md` | `auto_ameliore.py` | Analyse + propositions. **Aucune modif appliquée.** |
| `pipeline_AAAA-MM-JJ_HH-MM-SS.md` | `auto_pipeline.py` | Amélioration tentée + résultat du garde-fou + déploiement preview. |

## Comment lire un rapport `pipeline_*`

1. **Amélioration tentée** — la tâche que l'IA a choisi d'appliquer.
2. **Garde-fou** — les 3 contrôles :
   - `TypeScript : OK/ÉCHEC`
   - `Build : OK/ÉCHEC`
   - `Failles critiques / hautes`
   > Si un contrôle = ÉCHEC → le changement a été **annulé automatiquement**, rien n'est déployé.
3. **Déploiement** — l'URL de preview Vercel à ouvrir pour voir le résultat en vrai.

## Que faire avec un rapport

- ✅ **Le changement vous plaît** (preview OK) → fusionnez la branche `auto/cycle-...`
  dans `master`, puis déployez en prod : `npx vercel --prod`.
- ❌ **Le changement ne vous plaît pas** → supprimez la branche :
  `git branch -D auto/cycle-...` (rien n'a touché à `master`).

## Règles de sécurité

- La **production n'est jamais** déployée automatiquement tant que `AUTO_PROD = False`
  dans `scripts/auto_pipeline.py`.
- Le garde-fou (build + TypeScript + audit) ne doit **jamais** être désactivé.
- La clé Groq se met **uniquement** dans la variable d'environnement `GROQ_API_KEY`,
  jamais dans le code.

## Bon réflexe

Relisez ces rapports régulièrement : le garde-fou empêche le code *cassé*,
mais c'est **vous** qui jugez si un changement est *utile*.

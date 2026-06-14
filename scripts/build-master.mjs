// Construit UN fichier SQL unique et idempotent : base + tous les modules,
// dans le bon ordre de dépendances. À coller en une fois dans le SQL Editor.
import fs from 'node:fs'
import path from 'node:path'

const dir = 'supabase'
// Ordre IMPORTANT (dépendances) :
const order = [
  'setup.sql',       // base : schema, economy, arena, growth, social, otaku, engagement, security
  'admin_tools.sql', // RPC admin + ban temporaire + fix faille (dépend de is_admin / blocked_accounts)
  'studio.sql',      // bucket Storage "media" (upload photo/audio)
  'agents.sql',      // Mon IA : agents + pgvector + clonage (dépend de profiles / flexes)
  'games.sql',       // leaderboard (dépend de profiles)
  'challenges.sql',  // Cercle des Défis + déblocages de fonctionnalités (dépend de profiles)
  'comments.sql',    // fil de commentaires sous les Flexes (dépend de flexes / guard_content)
  'social_graph.sql',// suivi (follows) + confidentialité is_private (dépend de profiles)
  'pinlock.sql',     // verrou par code PIN sur les Flexes (FLEX Lite)
]

const header = `-- ═══════════════════════════════════════════════════════════════
--  FLEX — flex-master.sql  ★ FICHIER SQL UNIQUE & IDEMPOTENT ★
--  Colle TOUT ce fichier dans Supabase → SQL Editor → Run.
--  Ré-exécutable autant de fois que tu veux, sans aucune erreur,
--  que la base soit vierge ou déjà configurée.
--
--  Après le run (étapes manuelles, une seule fois) :
--   1) Authentication → Providers → Anonymous : ACTIVER
--   2) Storage : le bucket "receipts" (privé) si pas déjà créé
--      (le bucket "media" est créé automatiquement par ce script)
--   3) Crée ton compte KOMI via l'inscription de l'app, puis ré-exécute
--      ce fichier : la dernière section te promeut admin automatiquement.
-- ═══════════════════════════════════════════════════════════════

`

const footer = `

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  PROMOTION ADMIN AUTOMATIQUE (KOMI)                        ║
-- ║  Sans effet tant que le compte komi n'existe pas encore.  ║
-- ║  Une fois komi inscrit dans l'app, ré-exécute ce fichier. ║
-- ╚═══════════════════════════════════════════════════════════╝
insert into public.app_admins (user_id)
select id from public.profiles where username = 'komi'
on conflict (user_id) do nothing;
`

let body = header
for (const f of order) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8')
  body += `\n\n-- ╔═══════════════════════════════════════════════════════════╗\n`
  body += `-- ║  MODULE : ${f.padEnd(48)}║\n`
  body += `-- ╚═══════════════════════════════════════════════════════════╝\n\n`
  body += content.trimEnd() + '\n'
}
body += footer

fs.writeFileSync(path.join(dir, 'flex-master.sql'), body)
const lines = body.split('\n').length
console.log(`flex-master.sql écrit (${lines} lignes, ${order.length} modules + promo admin).`)

// ─────────────────────────────────────────────────────────────
// FLEX — Réinitialise le mot de passe des comptes EXISTANTS à « 0000 »
// via l'Admin API Supabase (méthode FIABLE : crée l'identité email et
// enlève le flag anonyme, contrairement au SQL brut).
//
// Chaque compte pourra ensuite se connecter avec : <pseudo> + 0000
// (l'email interne <pseudo>@flex.app est posé pour permettre ce login).
//
// PRÉREQUIS : la clé SERVICE_ROLE (Supabase → Settings → API → service_role).
//   ⚠️ Secrète. Ne jamais la committer. On la passe en variable d'env.
//
// UTILISATION (PowerShell, depuis le dossier du projet) :
//   $env:SUPABASE_SERVICE_ROLE_KEY="colle-la-cle-ici"
//   # 1) tester d'abord UN compte :
//   node scripts/set-passwords-0000.mjs --only=tonpseudo
//   # 2) puis tout le monde :
//   node scripts/set-passwords-0000.mjs
// ─────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// URL lue depuis .env.local ; clé service_role depuis l'environnement.
function envFromFile(key) {
  try {
    const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    const m = txt.match(new RegExp(`^${key}=(.*)$`, 'm'))
    return m ? m[1].trim() : undefined
  } catch {
    return undefined
  }
}

const URL_ = process.env.VITE_SUPABASE_URL || envFromFile('VITE_SUPABASE_URL')
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const only = onlyArg ? onlyArg.split('=')[1].trim().toLowerCase() : null
const PWD = '0000'

if (!URL_ || !KEY) {
  console.error('❌ Manque VITE_SUPABASE_URL (.env.local) ou SUPABASE_SERVICE_ROLE_KEY (env).')
  process.exit(1)
}

const admin = createClient(URL_, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

// Récupère les profils (non invités) à traiter.
let q = admin.from('profiles').select('id, username, is_guest').eq('is_guest', false)
if (only) q = q.eq('username', only)
const { data: profiles, error } = await q
if (error) {
  console.error('❌ Lecture profiles :', error.message)
  process.exit(1)
}
if (!profiles?.length) {
  console.error(only ? `Aucun profil « ${only} ».` : 'Aucun profil.')
  process.exit(1)
}

console.log(`→ ${profiles.length} compte(s) à passer au mot de passe « ${PWD} »…`)
let ok = 0
let fail = 0
for (const p of profiles) {
  const email = `${String(p.username).toLowerCase()}@flex.app`
  const { error: e } = await admin.auth.admin.updateUserById(p.id, {
    password: PWD,
    email,
    email_confirm: true,
  })
  if (e) {
    fail++
    console.warn(`  ✗ @${p.username} : ${e.message}`)
  } else {
    ok++
    console.log(`  ✓ @${p.username} → ${email} / ${PWD}`)
  }
}
console.log(`\nTerminé : ${ok} OK, ${fail} échec(s).`)

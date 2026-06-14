// ─────────────────────────────────────────────────────────────
// Smoke test : vérifie que le déploiement répond (routes + assets + bundle).
// Détecte les régressions d'infrastructure avant qu'un utilisateur les voie.
// Usage :  node scripts/smoke.mjs [baseUrl]
//          npm run smoke
// ─────────────────────────────────────────────────────────────
const BASE = process.argv[2] || 'https://flex-komi-erics-projects.vercel.app'

const ROUTES = [
  '/', '/signin', '/claim', '/app',
  '/app/search', '/app/challenges', '/app/games', '/app/live', '/app/edit-profile',
  '/flesh-admin-dashboard',
  '/manifest.webmanifest', '/sw.js',
]

let fail = 0

async function check(path) {
  try {
    const res = await fetch(BASE + path, { redirect: 'manual' })
    const ok = res.status === 200
    if (!ok) fail++
    console.log(`${ok ? '✅' : '❌'} ${res.status}  ${path}`)
  } catch (e) {
    fail++
    console.log(`❌ ERR  ${path}  ${e.message}`)
  }
}

console.log(`Smoke test → ${BASE}\n`)
for (const r of ROUTES) await check(r)

// Le bundle JS principal charge-t-il ?
try {
  const html = await (await fetch(BASE + '/')).text()
  const js = (html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0]
  if (js) await check(js)
} catch {
  /* ignore */
}

console.log(fail ? `\n❌ ${fail} échec(s) — déploiement à vérifier.` : '\n✅ Tout est vert.')
process.exit(fail ? 1 : 0)

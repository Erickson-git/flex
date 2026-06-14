// Rend les `alter publication ... add table ...` idempotents : chaque ligne
// est enveloppée dans un bloc qui ignore l'erreur « déjà membre » (42710).
import fs from 'node:fs'
import path from 'node:path'

const dir = 'supabase'
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))
let total = 0

for (const f of files) {
  const p = path.join(dir, f)
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/)
  const out = []
  let changed = 0

  for (const line of lines) {
    const m = line.match(/^(\s*)(alter\s+publication\s+.+add\s+table\s+.+;)\s*$/i)
    // ne pas re-wrapper si déjà dans un bloc do (ligne précédente = 'do $$ begin')
    const prev = out.length ? out[out.length - 1].trim().toLowerCase() : ''
    if (m && prev !== 'do $$ begin') {
      const [, indent, stmt] = m
      out.push(`${indent}do $$ begin`)
      out.push(`${indent}  ${stmt}`)
      out.push(`${indent}exception when duplicate_object then null; end $$;`)
      changed++
      continue
    }
    out.push(line)
  }

  if (changed) {
    fs.writeFileSync(p, out.join('\n'))
    console.log(`${f}: +${changed} bloc(s) publication idempotents`)
    total += changed
  }
}
console.log('TOTAL:', total)

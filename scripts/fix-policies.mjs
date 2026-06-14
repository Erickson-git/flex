// Rend toutes les `create policy` idempotentes : insère un
// `drop policy if exists "<name>" on <table>;` juste avant chaque création,
// sauf s'il y en a déjà un. Évite l'erreur 42710 au ré-run.
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
    const m = line.match(/^(\s*)create\s+policy\s+("[^"]+"|\S+)\s+on\s+(\S+)/i)
    if (m) {
      const [, indent, name, table] = m
      let j = out.length - 1
      while (j >= 0 && out[j].trim() === '') j--
      const prev = j >= 0 ? out[j].trim().toLowerCase() : ''
      const dropLine = `${indent}drop policy if exists ${name} on ${table};`
      if (prev !== dropLine.trim().toLowerCase()) {
        out.push(dropLine)
        changed++
      }
    }
    out.push(line)
  }

  if (changed) {
    fs.writeFileSync(p, out.join('\n'))
    console.log(`${f}: +${changed} garde(s) drop-policy`)
    total += changed
  }
}
console.log('TOTAL guards ajoutés:', total)

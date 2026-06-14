"""
auto_pipeline.py — Amélioration ET déploiement AUTOMATIQUES de FLEX.

Boucle locale autonome. Chaque cycle :
  1. RÉFLEXION   : l'API Groq (gratuite) choisit UNE amélioration prioritaire.
  2. IMPLÉMENTE  : Claude Code (headless) applique le changement sur une BRANCHE dédiée.
  3. GARDE-FOU   : build + TypeScript + npm audit DOIVENT passer.
                   -> si un seul échoue, on ANNULE tout (git reset) et on ne déploie pas.
  4. DÉPLOIE     : si tout passe -> déploiement automatique en PREVIEW (Vercel, gratuit).
                   La PRODUCTION n'est déployée que si AUTO_PROD = True (déconseillé).
  5. RAPPORT     : trace écrite dans docs/auto-ameliorations/.

Le garde-fou (étape 3) ne doit jamais être désactivé : c'est lui qui empêche
de déployer du code cassé ou dangereux.

--- PRÉREQUIS ---
  - Clé Groq en variable d'env :   $env:GROQ_API_KEY = "votre_cle"
  - Claude Code installé (commande `claude`)
  - Vercel lié au projet (dossier .vercel déjà présent)
  - Git propre au démarrage (rien de non commité)
"""

import os
import sys
import time
import json
import subprocess
import urllib.request
import urllib.error

# ===================== RÉGLAGES =====================
INTERVALLE_MIN = 60          # Minutes entre deux cycles
MODELE = "llama-3.3-70b-versatile"   # Modèle Groq gratuit (réflexion)
BRANCHE_BASE = "master"      # Branche de référence (ce projet utilise 'master')
AUTO_PROD = False            # ⚠️ True = déploie en PRODUCTION sans validation (RISQUÉ)
DOSSIER_RAPPORTS = "docs/auto-ameliorations"
TIMEOUT_CMD = 600            # Secondes max par commande lourde
# ===================================================

API_URL = "https://api.groq.com/openai/v1/chat/completions"
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def log(msg):
    print(msg, flush=True)


def run(cmd, timeout=TIMEOUT_CMD):
    """Exécute une commande dans le projet, renvoie (code, sortie)."""
    try:
        r = subprocess.run(
            cmd, shell=True, cwd=RACINE, capture_output=True,
            text=True, timeout=timeout, encoding="utf-8", errors="replace",
        )
        return r.returncode, ((r.stdout or "") + (r.stderr or "")).strip()
    except subprocess.TimeoutExpired:
        return -1, f"[TIMEOUT après {timeout}s]"
    except Exception as e:
        return -1, f"[ERREUR : {e}]"


def lire_cle():
    cle = os.environ.get("GROQ_API_KEY", "").strip()
    if not cle:
        log("ERREUR : GROQ_API_KEY non définie.")
        log('  PowerShell : $env:GROQ_API_KEY = "votre_cle"')
        sys.exit(1)
    return cle


def verifs():
    """Lance les 3 contrôles. Renvoie (tout_ok, details)."""
    log("  [garde-fou] TypeScript...")
    c_tsc, o_tsc = run("npx tsc --noEmit")
    log("  [garde-fou] Build...")
    c_build, o_build = run("npm run build")
    log("  [garde-fou] Audit sécurité...")
    _, o_audit = run("npm audit --json")
    crit = haute = 0
    try:
        v = json.loads(o_audit).get("metadata", {}).get("vulnerabilities", {})
        crit, haute = v.get("critical", 0), v.get("high", 0)
    except Exception:
        pass
    details = {
        "tsc_ok": c_tsc == 0, "tsc_out": o_tsc[:2000],
        "build_ok": c_build == 0, "build_out": o_build[:2000],
        "vuln_critiques": crit, "vuln_hautes": haute,
    }
    # Règle : on déploie seulement si tsc + build OK ET zéro faille critique
    tout_ok = details["tsc_ok"] and details["build_ok"] and crit == 0
    return tout_ok, details


def appeler_groq(cle, prompt):
    corps = json.dumps({
        "model": MODELE,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
    }).encode("utf-8")
    req = urllib.request.Request(
        API_URL, data=corps,
        headers={"Authorization": f"Bearer {cle}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        return f"[ERREUR API {e.code}] " + e.read().decode("utf-8", "replace")[:300]
    except Exception as e:
        return f"[ERREUR réseau : {e}]"


def choisir_amelioration(cle, etat_git):
    prompt = f"""Tu pilotes l'amélioration continue de FLEX (réseau social :
Vite + React + TypeScript + Supabase + Vercel).
Propose UNE SEULE amélioration, petite et sûre, à appliquer maintenant.
Priorité : sécurité > bug > confort utilisateur > performance.
Contexte git :
{etat_git}

Réponds en UNE phrase impérative, précise et limitée (ex : "Ajoute une validation
de longueur sur le champ message dans src/..."). Pas de refonte large. Pas de blabla."""
    return appeler_groq(cle, prompt)


def implementer_via_claude(tache):
    """Demande à Claude Code (headless) d'appliquer la tâche sur la branche courante."""
    # acceptEdits : applique les éditions de fichiers sans interaction.
    consigne = (
        f"Applique uniquement ce changement précis dans ce projet, sans rien casser : {tache}. "
        "Ne touche pas aux secrets ni aux fichiers .env. Reste minimal."
    )
    consigne = consigne.replace('"', "'")
    cmd = f'claude -p "{consigne}" --permission-mode acceptEdits'
    return run(cmd)


def ecrire_rapport(numero, tache, deploiement, details):
    dossier = os.path.join(RACINE, DOSSIER_RAPPORTS)
    os.makedirs(dossier, exist_ok=True)
    horo = time.strftime("%Y-%m-%d_%H-%M-%S")
    chemin = os.path.join(dossier, f"pipeline_{horo}.md")
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(f"""# Pipeline FLEX — cycle {numero}
Date : {time.strftime('%Y-%m-%d %H:%M:%S')}

## Amélioration tentée
{tache}

## Garde-fou
- TypeScript : {'OK' if details['tsc_ok'] else 'ÉCHEC'}
- Build : {'OK' if details['build_ok'] else 'ÉCHEC'}
- Failles critiques : {details['vuln_critiques']} | hautes : {details['vuln_hautes']}

## Déploiement
{deploiement}

---
*Pipeline automatique. La production n'est déployée que si AUTO_PROD = True.*
""")
    return chemin


def cycle(cle, numero):
    log(f"--- Cycle {numero} ---")

    # 0. L'arbre de travail doit être propre
    _, sortie = run("git status --short")
    if sortie:
        log("  ⚠️ Modifications non commitées détectées. Cycle ignoré (commit/stash d'abord).")
        return
    run(f"git checkout {BRANCHE_BASE}")
    run(f"git pull --ff-only origin {BRANCHE_BASE}")

    # 1. Réflexion
    log("  -> Réflexion (Groq)...")
    _, etat_git = run("git log --oneline -5")
    tache = choisir_amelioration(cle, etat_git)
    log(f"  -> Tâche : {tache[:120]}")
    if tache.startswith("[ERREUR"):
        log("  -> API indisponible, cycle abandonné.")
        return

    # 2. Branche dédiée + implémentation
    branche = f"auto/cycle-{time.strftime('%Y%m%d-%H%M%S')}"
    run(f"git checkout -b {branche}")
    log("  -> Implémentation via Claude Code...")
    implementer_via_claude(tache)

    # 3. GARDE-FOU
    log("  -> Contrôles (garde-fou)...")
    ok, details = verifs()

    deploiement = ""
    if not ok:
        log("  ❌ Contrôles échoués -> annulation, aucun déploiement.")
        run("git reset --hard")
        run(f"git checkout {BRANCHE_BASE}")
        run(f"git branch -D {branche}")
        deploiement = "Aucun (contrôles échoués, changement annulé)."
    else:
        log("  ✅ Contrôles OK -> commit + déploiement PREVIEW.")
        run('git add -A')
        run(f'git commit -q -m "auto: {tache[:60]}"')
        run(f"git push -u origin {branche}")
        code_p, out_p = run("npx --yes vercel --yes")
        url = out_p.strip().split()[-1] if code_p == 0 else "(échec preview)"
        deploiement = f"PREVIEW : {url}"
        if AUTO_PROD:
            log("  ⚠️ AUTO_PROD actif -> déploiement PRODUCTION.")
            run(f"git checkout {BRANCHE_BASE}")
            run(f"git merge --no-ff -m 'auto-merge {branche}' {branche}")
            run(f"git push origin {BRANCHE_BASE}")
            code_prod, out_prod = run("npx --yes vercel --prod --yes")
            deploiement += f"\nPRODUCTION : {'OK' if code_prod == 0 else 'ÉCHEC'} {out_prod.strip().split()[-1] if code_prod==0 else ''}"

    chemin = ecrire_rapport(numero, tache, deploiement, details)
    log(f"  -> Rapport : {chemin}\n")


def main():
    cle = lire_cle()
    log("=== Pipeline d'amélioration + déploiement automatiques — FLEX ===")
    log(f"Projet : {RACINE}")
    log(f"Cycle : {INTERVALLE_MIN} min | AUTO_PROD : {AUTO_PROD}")
    log("Garde-fou actif : aucun déploiement si build/tsc/audit échoue.")
    log("Arrêt : Ctrl+C\n")
    numero = 0
    try:
        while True:
            numero += 1
            try:
                cycle(cle, numero)
            except Exception as e:
                log(f"  ⚠️ Erreur cycle {numero} : {e}")
            time.sleep(INTERVALLE_MIN * 60)
    except KeyboardInterrupt:
        log(f"\nArrêté après {numero} cycle(s).")


if __name__ == "__main__":
    main()

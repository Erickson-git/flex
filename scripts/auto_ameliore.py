"""
auto_ameliore.py — Assistant local d'amélioration continue de FLEX.

Mode : "Propose, tu valides".
À chaque cycle, il :
  1. lance les contrôles qualité/sécurité (tsc + npm audit),
  2. demande à l'API Groq (gratuite) une analyse + des améliorations priorisées,
  3. écrit un rapport daté dans docs/auto-ameliorations/.

Il NE MODIFIE PAS le code et NE DÉPLOIE RIEN. Vous gardez le contrôle total.

--- CONFIGURATION DE LA CLÉ (obligatoire, JAMAIS en dur dans le code) ---
PowerShell (à faire une fois par session, ou dans les variables d'env Windows) :
    $env:GROQ_API_KEY = "votre_cle"
Puis lancez :
    python scripts/auto_ameliore.py
"""

import os
import sys
import time
import json
import subprocess
import urllib.request
import urllib.error

# ===================== RÉGLAGES =====================
INTERVALLE_MIN = 30          # Minutes entre deux cycles d'analyse
MODELE = "llama-3.3-70b-versatile"   # Modèle Groq gratuit
DOSSIER_RAPPORTS = "docs/auto-ameliorations"
TIMEOUT_CMD = 300            # Secondes max par commande (build/audit)
# ===================================================

API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Le dossier du projet = dossier parent de ce script (flex/)
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def log(msg):
    print(msg, flush=True)


def lire_cle():
    cle = os.environ.get("GROQ_API_KEY", "").strip()
    if not cle:
        log("ERREUR : la variable GROQ_API_KEY n'est pas définie.")
        log('  PowerShell : $env:GROQ_API_KEY = "votre_cle"')
        log("  (Utilisez une NOUVELLE clé. Ne la collez jamais dans le code.)")
        sys.exit(1)
    return cle


def run(cmd):
    """Exécute une commande shell dans le dossier du projet, renvoie (code, sortie)."""
    try:
        r = subprocess.run(
            cmd, shell=True, cwd=RACINE, capture_output=True,
            text=True, timeout=TIMEOUT_CMD, encoding="utf-8", errors="replace",
        )
        sortie = (r.stdout or "") + (r.stderr or "")
        return r.returncode, sortie.strip()
    except subprocess.TimeoutExpired:
        return -1, f"[TIMEOUT après {TIMEOUT_CMD}s]"
    except Exception as e:
        return -1, f"[ERREUR commande : {e}]"


def collecter_etat():
    """Lance les contrôles et renvoie un résumé texte de l'état du projet."""
    log("  -> Vérification TypeScript (tsc)...")
    code_tsc, out_tsc = run("npx tsc --noEmit")
    tsc_resume = "Aucune erreur de type." if code_tsc == 0 else out_tsc[:4000]

    log("  -> Audit de sécurité (npm audit)...")
    _, out_audit = run("npm audit --json")
    audit_resume = "Audit indisponible."
    try:
        data = json.loads(out_audit)
        vuln = data.get("metadata", {}).get("vulnerabilities", {})
        audit_resume = (
            f"critiques={vuln.get('critical',0)}, "
            f"hautes={vuln.get('high',0)}, "
            f"moyennes={vuln.get('moderate',0)}, "
            f"faibles={vuln.get('low',0)}"
        )
    except Exception:
        audit_resume = out_audit[:1500]

    log("  -> État Git (fichiers modifiés)...")
    _, out_git = run("git status --short")
    git_resume = out_git[:1500] if out_git else "Aucune modification non commitée."

    return {
        "typescript": tsc_resume,
        "securite_npm_audit": audit_resume,
        "git_status": git_resume,
    }


def construire_prompt(etat):
    return f"""Tu es un ingénieur senior chargé d'améliorer FLEX, un réseau social
(stack : Vite + React + TypeScript + Supabase + Vercel + Capacitor).
Objectif : qualité, SÉCURITÉ, performance et confort utilisateur, avec des ressources GRATUITES.

État actuel du projet :

[Erreurs TypeScript]
{etat['typescript']}

[Sécurité — npm audit]
{etat['securite_npm_audit']}

[Modifications en cours — git status]
{etat['git_status']}

Donne une réponse EN FRANÇAIS, concise et actionnable, structurée ainsi :
1. **Sécurité** : risques détectés + correctif précis (commande ou fichier).
2. **Bugs / erreurs de type** : à corriger en priorité.
3. **3 améliorations max** (perf ou confort utilisateur) classées par impact/effort.
Pour chaque point : QUOI, POURQUOI, et COMMENT (étape concrète).
Reste réaliste : pas de promesses, des actions précises."""


def appeler_groq(cle, prompt):
    corps = json.dumps({
        "model": MODELE,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.4,
    }).encode("utf-8")
    req = urllib.request.Request(
        API_URL, data=corps,
        headers={
            "Authorization": f"Bearer {cle}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")[:500]
        return f"[ERREUR API {e.code}] {detail}"
    except Exception as e:
        return f"[ERREUR réseau : {e}]"


def ecrire_rapport(numero, analyse, etat):
    dossier = os.path.join(RACINE, DOSSIER_RAPPORTS)
    os.makedirs(dossier, exist_ok=True)
    # Horodatage simple basé sur le temps local
    horo = time.strftime("%Y-%m-%d_%H-%M-%S")
    chemin = os.path.join(dossier, f"rapport_{horo}.md")
    contenu = f"""# Rapport d'amélioration FLEX — cycle {numero}
Date : {time.strftime('%Y-%m-%d %H:%M:%S')}

## Contrôles automatiques
- **TypeScript** : {('OK' if etat['typescript'] == 'Aucune erreur de type.' else 'erreurs détectées (voir analyse)')}
- **Sécurité (npm audit)** : {etat['securite_npm_audit']}

## Analyse & propositions (IA Groq — À VALIDER PAR VOUS)
{analyse}

---
*Généré automatiquement. Aucune modification n'a été appliquée au code ni déployée.*
"""
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(contenu)
    return chemin


def main():
    cle = lire_cle()
    log("=== Assistant d'amélioration continue de FLEX ===")
    log(f"Projet : {RACINE}")
    log(f"Modèle Groq : {MODELE} | Cycle toutes les {INTERVALLE_MIN} min")
    log("Mode : PROPOSE, TU VALIDES (aucune modif/déploiement automatique).")
    log("Arrêt : Ctrl+C\n")

    numero = 0
    try:
        while True:
            numero += 1
            log(f"--- Cycle {numero} ---")
            etat = collecter_etat()
            log("  -> Réflexion via l'API Groq...")
            analyse = appeler_groq(cle, construire_prompt(etat))
            chemin = ecrire_rapport(numero, analyse, etat)
            log(f"  -> Rapport écrit : {chemin}")
            log(f"  -> Prochain cycle dans {INTERVALLE_MIN} min.\n")
            time.sleep(INTERVALLE_MIN * 60)
    except KeyboardInterrupt:
        log(f"\nArrêté par l'utilisateur après {numero} cycle(s).")


if __name__ == "__main__":
    main()

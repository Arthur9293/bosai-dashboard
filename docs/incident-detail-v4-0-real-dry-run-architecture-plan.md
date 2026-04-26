# Incident Detail V4.0 — Real Dry Run Architecture Plan

## Statut

**Document de conception uniquement.**

Cette étape ne branche aucune exécution réelle.

V4.0 prépare le contrat technique du futur dry run contrôlé pour la page détail incident BOSAI.

Aucun fichier applicatif n’est modifié par ce palier.

---

## 1. Objectif V4.0

V4.0 ne doit pas implémenter le dry run.

V4.0 sert uniquement à définir :

- le contrat futur du dry run ;
- les responsabilités du frontend ;
- les responsabilités de la route serveur ;
- les responsabilités du worker ;
- les garde-fous obligatoires ;
- les validations nécessaires ;
- les états de retour attendus ;
- les erreurs prévues ;
- le plan de migration vers V4.1 et les versions suivantes.

Le principe central est strict :

> Le dashboard pourra préparer une simulation, mais l’exécution restera toujours contrôlée, server-side, authentifiée, journalisée et forcée en `dry_run: true`.

---

## 2. Architecture cible

Flux futur attendu :

```text
Incident Detail Page
→ Server-only route/action sécurisée
→ Worker /run
→ dry_run: true obligatoire
→ réponse simulée
→ affichage résultat dans le dashboard
→ aucune mutation incident directe
```

La page incident ne doit jamais appeler directement le worker.

Le secret d’exécution ne doit jamais apparaître dans :

- le navigateur ;
- le bundle client ;
- les props envoyées au client ;
- les query params ;
- le localStorage ;
- le sessionStorage ;
- un formulaire HTML ;
- un bouton client.

Le secret est uniquement disponible côté serveur.

---

## 3. Frontend rules

Le frontend peut afficher :

- l’état incident ;
- le chemin Incident → Command → Run → Flow → Event ;
- la readiness ;
- le payload preview ;
- la confirmation gate ;
- l’arm switch preview ;
- le résultat simulé futur quand V4.4 sera implémentée.

Le frontend ne doit jamais faire :

- de fetch client vers `POST /run` ;
- d’appel direct au worker ;
- d’injection de secret dans le navigateur ;
- de mutation Airtable directe ;
- d’écriture incident ;
- de retry réel ;
- d’escalade réelle ;
- de bouton exécutable sans double confirmation opérateur ;
- de server action exposée sans validation stricte.

Règle stricte :

> Le frontend demande une simulation à une route serveur BOSAI. Il ne parle jamais directement au worker.

---

## 4. Server-side contract

Route serveur future proposée :

```text
POST /api/incidents/[id]/dry-run
```

Cette route n’est pas implémentée dans V4.0.

Quand elle sera créée, elle devra :

1. vérifier la session utilisateur ;
2. vérifier le workspace actif ;
3. vérifier que l’utilisateur peut accéder à l’incident ;
4. vérifier que l’incident existe ;
5. reconstruire le payload côté serveur ;
6. ignorer tout payload client dangereux ;
7. forcer `dry_run: true` ;
8. refuser explicitement `dry_run: false` ;
9. injecter le secret côté serveur uniquement ;
10. appeler le worker `/run` ;
11. appliquer un timeout strict ;
12. retourner une réponse de simulation ;
13. journaliser la demande de dry run ;
14. ne jamais modifier directement l’incident ;
15. ne jamais déclencher d’action réelle.

La route devra être server-only.

---

## 5. Worker contract

Payload cible attendu pour le futur dry run :

```json
{
  "capability": "command_orchestrator",
  "workspace_id": "...",
  "incident_id": "...",
  "command_id": "...",
  "run_id": "...",
  "flow_id": "...",
  "root_event_id": "...",
  "dry_run": true,
  "source": "dashboard_incident_detail_v4_dry_run"
}
```

Le worker devra :

- accepter uniquement `dry_run: true` pour ce chemin ;
- refuser `dry_run: false` ;
- refuser l’absence de `dry_run` ;
- ne pas muter les incidents ;
- ne pas créer d’escalade réelle ;
- ne pas déclencher de retry réel ;
- ne pas modifier le statut incident ;
- retourner un résultat simulé ;
- inclure clairement `dry_run: true` dans le résultat ;
- journaliser que l’appel est une simulation ;
- ne jamais convertir automatiquement un dry run en run réel.

Réponse worker future recommandée :

```json
{
  "ok": true,
  "dry_run": true,
  "simulated": true,
  "capability": "command_orchestrator",
  "workspace_id": "...",
  "incident_id": "...",
  "command_id": "...",
  "flow_id": "...",
  "root_event_id": "...",
  "would_execute": {
    "target": "command_orchestrator",
    "mode": "dry_run",
    "mutations": false,
    "worker_actions": false
  },
  "result_summary": "Dry run simulated successfully.",
  "warnings": [],
  "source": "dashboard_incident_detail_v4_dry_run"
}
```

---

## 6. Required guardrails

Garde-fous obligatoires :

- `dry_run: true` forcé côté serveur ;
- `dry_run: false` refusé ;
- secret côté serveur uniquement ;
- double confirmation opérateur ;
- workspace obligatoire ;
- incident obligatoire ;
- command ou flow fortement recommandé ;
- rate limit ;
- idempotency key ;
- audit log ;
- timeout strict ;
- erreurs explicites ;
- aucune mutation incident ;
- aucune exécution réelle ;
- aucune escalade automatique ;
- aucun retry automatique ;
- aucun appel worker depuis le client ;
- aucun secret exposé au client ;
- aucun bouton réel sans état armé contrôlé.

---

## 7. Failure modes

Erreurs attendues côté route serveur :

### Workspace manquant

Code recommandé :

```text
400 WORKSPACE_REQUIRED
```

Message :

```text
Workspace context is required for dry run.
```

### Incident manquant

Code recommandé :

```text
404 INCIDENT_NOT_FOUND
```

Message :

```text
Incident was not found or is not accessible.
```

### Command manquante

Code recommandé :

```text
409 COMMAND_MISSING
```

Message :

```text
No linked command is available for this incident.
```

### Flow manquant

Code recommandé :

```text
409 FLOW_MISSING
```

Message :

```text
No linked flow is available for this incident.
```

### Secret absent

Code recommandé :

```text
500 SERVER_SECRET_MISSING
```

Message :

```text
Dry run server secret is not configured.
```

### Worker indisponible

Code recommandé :

```text
502 WORKER_UNAVAILABLE
```

Message :

```text
BOSAI worker is unavailable.
```

### dry_run absent

Code recommandé :

```text
400 DRY_RUN_REQUIRED
```

Message :

```text
dry_run: true is required.
```

### dry_run false

Code recommandé :

```text
400 REAL_RUN_FORBIDDEN
```

Message :

```text
Real execution is forbidden from this route.
```

### Timeout worker

Code recommandé :

```text
504 WORKER_TIMEOUT
```

Message :

```text
Dry run worker request timed out.
```

### Réponse worker invalide

Code recommandé :

```text
502 INVALID_WORKER_RESPONSE
```

Message :

```text
Worker returned an invalid dry run response.
```

### Utilisateur non autorisé

Code recommandé :

```text
403 FORBIDDEN
```

Message :

```text
User is not authorized to dry run this incident.
```

---

## 8. UI future state

V4.0 ne modifie pas encore l’UI.

États futurs possibles à partir de V4.1+ :

- `DRY RUN READY`
- `DRY RUN RUNNING`
- `DRY RUN SIMULATED`
- `DRY RUN FAILED`
- `DRY RUN BLOCKED`

Définition proposée :

### DRY RUN READY

Le contexte est suffisant, la confirmation est possible, mais aucune simulation n’est en cours.

### DRY RUN RUNNING

La route serveur a reçu une demande confirmée et attend une réponse worker simulée.

### DRY RUN SIMULATED

Le worker a répondu avec `dry_run: true` et aucun effet réel.

### DRY RUN FAILED

La simulation a échoué.

### DRY RUN BLOCKED

Le système refuse la simulation pour raison de sécurité, de contexte ou de permission.

---

## 9. Migration plan

### V4.0

Créer ce document d’architecture uniquement.

Aucune modification applicative.

### V4.1

Créer un squelette de route serveur :

```text
POST /api/incidents/[id]/dry-run
```

Sans appel worker.

La route retourne uniquement :

```json
{
  "ok": false,
  "dry_run": true,
  "status": "ROUTE_SKELETON_ONLY"
}
```

### V4.2

Ajouter validation payload côté serveur :

- workspace ;
- incident ;
- command ;
- run ;
- flow ;
- root_event_id ;
- `dry_run: true`.

Toujours aucun appel worker.

### V4.3

Brancher l’appel worker avec :

- `dry_run: true` forcé ;
- secret côté serveur ;
- timeout ;
- réponse simulée.

### V4.4

Afficher le résultat simulé dans la page incident.

Aucune mutation incident.

### V4.5

Ajouter audit log dry run.

Journaliser :

- user ;
- workspace ;
- incident ;
- command ;
- flow ;
- timestamp ;
- résultat simulé ;
- erreur éventuelle.

### V4.6

Ajouter permission / workspace policy.

Contrôler :

- entitlement workspace ;
- capacité dry run autorisée ;
- rôle utilisateur ;
- politique d’environnement.

### V4.7

Ajouter bouton réel armé mais double-confirmé.

Toujours uniquement dry run.

Aucune exécution réelle.

---

## 10. Non-goals

V4.0 ne doit pas :

- modifier la page incident ;
- ajouter de bouton ;
- ajouter de server action ;
- appeler le worker ;
- écrire Airtable ;
- modifier les endpoints ;
- modifier Incident List ;
- modifier la baseline V3.8 ;
- ajouter de fetch client ;
- exposer un secret ;
- déclencher `POST /run` ;
- créer une exécution réelle ;
- créer une escalade ;
- créer un retry ;
- modifier un incident ;
- modifier un run ;
- modifier une command.

---

## 11. Décision de baseline

Ce document devient le contrat officiel avant toute implémentation V4.1.

Toute future étape V4.x doit préserver :

- Cockpit V1 ;
- Incident List V2.43 ;
- Incident Detail V3.0 à V3.8 ;
- absence d’exécution réelle tant que le dry run contrôlé n’est pas validé ;
- secret uniquement côté serveur ;
- `dry_run: true` obligatoire ;
- aucune mutation incident directe.

# Git-Wiederherstellung

## Enthaltener Git-Stand

- Standardbranch: `main`
- Sites-Quellrepository: `https://git.chatgpt-team.site/50a49e4a-7b71-42e3-b841-a85b294eb076/appgprj_6ad0dcc12e0081918124d272a633f91c.git`
- Die zum Paket gehörende Commit-ID steht zusätzlich in `PROJEKTINFO.json` und `WIEDERHERSTELLUNG.md` des Wiederherstellungspakets.

Das ZIP enthält bewusst keinen `.git`-Ordner und keine Zugangsdaten. Der vollständige Quellstand ist enthalten; die Versionsverwaltung kann reproduzierbar neu angelegt oder mit dem bestehenden Sites-Repository verbunden werden.

## Neues lokales Repository anlegen

Im entpackten Ordner `app`:

```text
git init -b main
git add .
git commit -m "Restore OBD2 Klartext"
```

Vor dem Commit sollten Name und E-Mail konfiguriert sein. Diese persönlichen Angaben werden nicht im Paket gespeichert.

## Bestehendes Sites-Repository verbinden

Nur mit einem gültigen, kurzlebigen Schreibzugang aus dem Sites-Projekt:

```text
git remote add origin https://git.chatgpt-team.site/50a49e4a-7b71-42e3-b841-a85b294eb076/appgprj_6ad0dcc12e0081918124d272a633f91c.git
git fetch origin
git branch --set-upstream-to=origin/main main
```

Wenn bereits ein `origin` existiert, zuerst mit `git remote -v` prüfen und die Adresse nur bei Bedarf mit `git remote set-url origin …` ändern.

## Abgleich prüfen

```text
git status
git log --oneline --decorate -10
git remote -v
```

Die Repository-Adresse allein gewährt keinen Zugriff. Für Abruf oder Veröffentlichung auf der bestehenden Site ist eine gültige Berechtigung im zugehörigen Sites-Projekt erforderlich. Tokens oder eingebettete Zugangsdaten dürfen nicht in Git-Konfigurationen, Commits oder ZIP-Dateien gespeichert werden.


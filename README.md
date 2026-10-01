# Free Fire Bot — Vercel Web Dashboard & Cloud API

Questa cartella (`vercel-dashboard`) contiene il sito web completo e le API serverless pronte per essere ospitate gratuitamente su **Vercel**.

---

## 🚀 Come fare il deploy su Vercel da Terminale

### Opzione 1: Con lo script automatico
Fai doppio click su `deploy.bat` oppure apri PowerShell in questa cartella ed esegui:
```powershell
.\deploy.bat
```

### Opzione 2: Comando manuale da terminale
1. Apri il terminale in questa cartella:
   ```powershell
   cd "c:\Users\LINUXITO\Desktop\new ui\UDPP\vercel-dashboard"
   ```
2. Esegui il comando di deploy Vercel:
   ```powershell
   npx.cmd vercel --prod
   ```
3. Se è la prima volta che usi Vercel da terminale:
   - Premi `Enter` per confermare l'account o fai il login da browser se richiesto.
   - Conferma con `Y` le domande standard di setup (impostazioni di default già configurate).
4. Alla fine, il terminale ti mostrerà il link del tuo sito web live, ad esempio:
   `https://ff-bot-dashboard-xxxx.vercel.app`

---

## 🔗 Come collegare il Bot al sito su Vercel

1. Copia l'URL che Vercel ti ha assegnato (es. `https://tuo-bot.vercel.app`).
2. Apri il file `bot_config.json` nella cartella principale (`UDPP`) e incolla l'URL:
   ```json
   {
     "vercel_url": "https://tuo-bot.vercel.app",
     "bot_secret": "",
     "sync_interval_seconds": 1.5,
     "enable_vercel_sync": true
   }
   ```
3. Avvia il bot come al solito (`python Main.py` o `python 1.py`).
4. Il bot si collegherà automaticamente in tempo reale al tuo sito Vercel:
   - Invierà le statistiche degli account, EXP, partite attive e log.
   - Riceverà ed eseguirà i comandi inviati dalla dashboard (Aggiunta account, eliminazione, pausa/ripresa, restart).

---

## 📁 Struttura creata

- `index.html` e `public/index.html`: La dashboard Cyberpunk con tracking EXP in tempo reale, gestione account e badge di stato connessione bot.
- `api/stats.js`: Endpoint `GET /api/stats` che restituisce lo stato degli account e del bot.
- `api/bot/sync.js`: Il ponte cloud che sincronizza il bot Python locale con la dashboard Vercel.
- `api/account/add.js`: Aggiunge account alla rotazione del bot.
- `api/account/delete.js`: Elimina account e pulisce cache/token.
- `api/account/pause.js`: Mette in pausa o riprende un account.
- `api/account/pause_all.js`: Mette in pausa o riprende tutti gli account.
- `api/account/refresh.js`: Forza il refresh dati account dal server di gioco.
- `api/account/restart.js`: Riavvia il worker dell'account.
- `api/logs/clear.js`: Pulisce la console dei log.
- `api/lib/store.js`: Gestore di memoria condivisa e supporto opzionale Upstash/Vercel KV o proxy diretto.
- `vercel.json`: Configurazione Vercel con intestazioni CORS complete.

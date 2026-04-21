# MARKET360-BACKEND

## Local setup

Create a local environment file before running the server:

```powershell
Copy-Item .env.example .env
```

Then edit `.env` and set at least:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/market360
JWT_SECRET=change-this-local-secret
CSRF_SECRET=change-this-local-csrf-secret
```

Run:

```powershell
npm install
node server.js
```

The scheduler is disabled unless `ENABLE_SCHEDULER=true`.

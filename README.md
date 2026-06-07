# ShareSpace — Apartment Bill Splitter

Smart flatmate bill splitter with server-side persistence, built with raw HTML, CSS, and JavaScript.

## Deploy to Vercel

1. Push to GitHub and import in Vercel
2. Add **Redis** from [Vercel Marketplace](https://vercel.com/marketplace?category=storage&search=redis) (Upstash) — auto-sets `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Deploy — root `/` opens `index.html`

### Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3456 — data saves to `data/store.json`.

## Bill logic

- **Base rent**: fixed amounts per member (optional), remainder split among others
- **Electricity**: equal split, entered monthly (locked once saved)
- **Gas, Water, Service, Maid, WiFi**: equal split among all members

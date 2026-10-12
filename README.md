# claude-code-website-demo-jy
trying out designs for engineering architect website

## Stack
React + TypeScript, built with Vite.

## Getting started
Requires Node.js 20.19+ (or 22.12+).

```sh
npm install
npm run dev      # start dev server at http://localhost:5173
npm run build    # type-check and build to dist/
npm run preview  # serve the production build
```

## Visitor audit (admin)
`/admin` is a password-protected dashboard of who visits the site (weekly,
monthly and all-time counts, a trend chart, breakdowns, and a visitor grid).

- `src/track.ts` sends one beacon per page load to `api/track.ts` (production only).
- `api/` holds Vercel functions; visits are stored in Neon Postgres. The
  `visits` table is created automatically on first request.
- The admin UI is a separate Vite entry (`admin.html` → `src/admin/`).

Vercel environment variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Set automatically when the Neon database is connected to the project |
| `ADMIN_PASSWORD` | Password for `/admin` |
| `VISITOR_SALT` | Optional; salt for hashing IPs (defaults to `ADMIN_PASSWORD`) |

`npm run dev` doesn't run the `api/` functions — use `npx vercel dev` to test
them locally (after `npx vercel link` and `npx vercel env pull`).

import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The public address of the site, for link previews, the canonical URL and the
// sitemap. SITE_URL overrides; otherwise Vercel's production domain (its custom
// domain once one is added), which Vercel sets on every build.
function siteUrl() {
  const explicit = process.env.SITE_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return vercel ? `https://${vercel}` : 'http://localhost:5173'
}

// Fills __SITE_URL__ in the HTML and emits robots.txt and sitemap.xml.
function siteMeta(): Plugin {
  const url = siteUrl()
  return {
    name: 'site-meta',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', url),
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${url}/sitemap.xml\n`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          `  <url><loc>${url}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n` +
          '</urlset>\n',
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteMeta()],
  build: {
    rollupOptions: {
      // The admin dashboard is its own entry so none of it ships to visitors.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
      },
    },
  },
})

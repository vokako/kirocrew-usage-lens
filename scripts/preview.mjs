/*
 * Build the offline preview into out/preview/, then optionally serve it.
 *
 *   node scripts/preview.mjs           build only
 *   node scripts/preview.mjs --serve   build and serve on 127.0.0.1:8977
 *
 * Unlike the app bundle, this one BUNDLES react and aliases the two host modules
 * to local stand-ins, because there is no dashboard here to provide them. The page
 * component itself is imported unchanged from src/, so what the preview shows is
 * the real page rather than a mock of it.
 */
import { build } from 'esbuild'
import { copyFileSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const out = join(root, 'out', 'preview')
const HOST = '127.0.0.1'
const PORT = Number(process.env.PREVIEW_PORT || 8977)

mkdirSync(out, { recursive: true })

await build({
  entryPoints: [join(root, 'tools', 'preview', 'mount.tsx')],
  outfile: join(out, 'preview.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  loader: { '.json': 'json' },
  alias: {
    '@kirocrew/app-sdk': join(root, 'tools', 'preview', 'host.ts'),
    '@kirocrew/app-sdk/ui': join(root, 'tools', 'preview', 'ui.tsx'),
  },
  minify: false,
  sourcemap: false,
})
copyFileSync(join(root, 'tools', 'preview', 'index.html'), join(out, 'index.html'))
console.log(`built ${join(out, 'index.html')}`)

if (!process.argv.includes('--serve')) process.exit(0)

const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' }

// Loopback only, and only the two files the preview needs — this serves a build
// directory, so it must not become a way to read the rest of the tree.
createServer(async (request, response) => {
  const name = (request.url || '/').split('?')[0] === '/' ? '/index.html' : (request.url || '').split('?')[0]
  if (!['/index.html', '/preview.mjs'].includes(name)) {
    response.writeHead(404).end('not found')
    return
  }
  try {
    const body = await readFile(join(out, name.slice(1)))
    response.writeHead(200, { 'Content-Type': TYPES[extname(name)] || 'application/octet-stream' })
    response.end(body)
  } catch {
    response.writeHead(404).end('not found')
  }
}).listen(PORT, HOST, () => console.log(`preview on http://${HOST}:${PORT}/`))

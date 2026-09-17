/*
 * Bundle src/ into ui/index.mjs — the artifact app.json's `ui.entry` points at.
 *
 * Everything the dashboard provides through its import map stays EXTERNAL: react,
 * the JSX runtime, lucide-react, and the two app-sdk entry points are resolved at
 * load time from /vendor/*.mjs. Bundling any of them would ship a second React
 * into a page that already has one.
 */
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.tsx'],
  outfile: 'ui/index.mjs',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  treeShaking: true,
  minify: true,
  lineLimit: 120,
  legalComments: 'none',
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'lucide-react',
    '@kirocrew/app-sdk',
    '@kirocrew/app-sdk/ui',
  ],
})

console.log('built ui/index.mjs')

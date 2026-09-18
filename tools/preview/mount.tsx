/* Preview entry: mount the real page component into a standalone document. */
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'

import UsageLens from '../../src/index'

const root = document.getElementById('root')
if (!root) throw new Error('preview: #root is missing')
createRoot(root).render(createElement(UsageLens))

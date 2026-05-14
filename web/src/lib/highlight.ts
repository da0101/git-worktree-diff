import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-dart'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-go'

const EXT_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  css: 'css',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  py: 'python',
  dart: 'dart',
  swift: 'swift',
  go: 'go',
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function getLanguage(filename: string): string {
  const base = filename.split('/').pop() ?? filename
  const ext = base.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MAP[ext] ?? ''
}

export function highlightLine(content: string, language: string): string {
  if (!language || !content.trim()) return escapeHtml(content)
  const grammar = Prism.languages[language]
  if (!grammar) return escapeHtml(content)
  try {
    return Prism.highlight(content, grammar, language)
  } catch {
    return escapeHtml(content)
  }
}

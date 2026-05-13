import { gitAction } from './handlers/git-actions.mjs'
import {
  addRepo,
  checkoutBranch,
  listRepos,
  pickRepo,
  removeRepo,
  repoDiff,
  repoStatus,
} from './handlers/repos.mjs'
import { send } from './lib/http.mjs'

const routes = [
  ['GET', '/api/repos', listRepos],
  ['POST', '/api/repos', addRepo],
  ['POST', '/api/repos/pick', pickRepo],
  ['DELETE', '/api/repos', removeRepo],
  ['GET', '/api/repos/diff', repoDiff],
  ['GET', '/api/repos/status', repoStatus],
  ['POST', '/api/repos/checkout', checkoutBranch],
]

export async function route(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  if (req.method === 'OPTIONS') {
    send(res, 204, { ok: true })
    return
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    send(res, 200, { ok: true, data: { status: 'ok' } })
    return
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/git/')) {
    await gitAction(req, res, url.pathname.replace('/api/git/', ''))
    return
  }

  const match = routes.find(([method, pathname]) => req.method === method && url.pathname === pathname)
  if (match) {
    await match[2](req, res, url)
    return
  }

  send(res, 404, { ok: false, error: 'Not found' })
}

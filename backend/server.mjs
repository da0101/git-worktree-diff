import { createServer } from 'node:http'
import { send } from './lib/http.mjs'
import { route } from './router.mjs'

const port = Number(process.env.PORT || 8420)

const server = createServer(async (req, res) => {
  try {
    await route(req, res)
  } catch (error) {
    send(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected server error',
    })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`git-worktree-diff backend listening on http://127.0.0.1:${port}`)
})

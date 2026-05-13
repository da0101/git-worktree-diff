export async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export function bodyString(body, key) {
  return typeof body[key] === 'string' ? body[key].trim() : ''
}

export function bodyFiles(body) {
  return Array.isArray(body.files)
    ? body.files.filter(file => typeof file === 'string' && file.trim()).map(file => file.trim())
    : []
}

export function send(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export function sendError(res, error, fallback = 'Unexpected server error') {
  send(res, error.statusCode ?? 500, {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  })
}

export function httpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

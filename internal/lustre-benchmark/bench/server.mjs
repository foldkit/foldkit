import { existsSync, readFileSync, statSync } from 'node:fs'
import http from 'node:http'
import { extname, join, normalize, sep } from 'node:path'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
}

/**
 * Serves the lustre-labs/benchmark harness directory at `/` and this bench
 * directory at `/__runner/`, with COOP/COEP headers on every response so the
 * page is cross-origin isolated and performance.now() has full precision,
 * matching the conditions of the real harness.
 */
export const startServer = (harnessDir, benchDir, port) => {
  const roots = [
    { prefix: '/__runner/', dir: benchDir },
    { prefix: '/', dir: harnessDir },
  ]

  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost')
    let pathname = decodeURIComponent(url.pathname)
    if (pathname.endsWith('/')) {
      pathname += 'index.html'
    }
    const root = roots.find(candidate => pathname.startsWith(candidate.prefix))
    const relativePath = pathname.slice(root.prefix.length)
    const filePath = normalize(join(root.dir, relativePath))
    const normalizedRoot = normalize(root.dir)
    if (
      filePath !== normalizedRoot &&
      !filePath.startsWith(normalizedRoot + sep)
    ) {
      response.writeHead(403).end()
      return
    }
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      response.writeHead(404).end(`not found: ${pathname}`)
      return
    }
    response.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cache-Control': 'no-store',
    })
    response.end(readFileSync(filePath))
  })

  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

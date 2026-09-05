import {
  HOST_METHOD_ANSWERS,
  isHostSettledMethod,
  resolveRequestUrl,
  resolvesToIndexHtml,
} from 'foldkit/experimental/server'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, relative, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

const clientDir = fileURLToPath(new URL('../dist/client', import.meta.url))
const port = Number(process.env.PORT ?? 3000)
if (process.env.ORIGIN === undefined || process.env.ORIGIN === '') {
  process.env.ORIGIN = `http://localhost:${port}`
}
const origin = process.env.ORIGIN
const { default: app } = await import('../dist/server/fetch.js')

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

const fileFor = async url => {
  let pathname
  try {
    pathname = decodeURIComponent(new URL(url, origin).pathname)
  } catch {
    return
  }
  const candidate = resolve(clientDir, pathname.slice(1))
  const rel = relative(clientDir, candidate)
  if (rel.startsWith(`..${sep}`) || rel.startsWith('..')) {
    return
  }
  try {
    const info = await stat(candidate)
    if (info.isFile()) {
      return candidate
    }
  } catch {
    return
  }
}

const toRequest = (nodeRequest, requestUrl) => {
  const headers = new Headers()
  for (const [name, value] of Object.entries(nodeRequest.headers)) {
    if (typeof value === 'string') {
      headers.set(name, value)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item)
      }
    }
  }
  const method = nodeRequest.method ?? 'GET'
  const init = { headers, method }
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = Readable.toWeb(nodeRequest)
    init.duplex = 'half'
  }
  return new Request(requestUrl, init)
}

const writeResponse = async (nodeResponse, response) => {
  const headers = Object.fromEntries(response.headers)
  nodeResponse.writeHead(response.status, headers)
  if (response.body === null) {
    nodeResponse.end()
    return
  }
  Readable.fromWeb(response.body).pipe(nodeResponse)
}

createServer((nodeRequest, nodeResponse) => {
  void (async () => {
    const method = (nodeRequest.method ?? 'GET').toUpperCase()
    // NOTE: refuse an off-origin target before looking for a file. A
    // network-path request such as `//evil.example/../assets/app.js` names
    // another host, then a path that exists on disk. Serving that file would
    // leak the asset instead of answering 400.
    const requestUrl = resolveRequestUrl(nodeRequest.url ?? '/', origin)
    if (requestUrl === undefined) {
      nodeResponse.statusCode = 400
      nodeResponse.end()
      return
    }
    if (isHostSettledMethod(method)) {
      nodeResponse.statusCode = HOST_METHOD_ANSWERS.refusedStatus
      nodeResponse.setHeader('allow', HOST_METHOD_ANSWERS.allow)
      nodeResponse.end()
      return
    }
    if (
      (method === 'GET' || method === 'HEAD') &&
      !resolvesToIndexHtml(requestUrl)
    ) {
      const file = await fileFor(requestUrl)
      if (file !== undefined) {
        const type = types[extname(file).toLowerCase()]
        if (type !== undefined) {
          nodeResponse.setHeader('content-type', type)
        }
        if (method === 'HEAD') {
          nodeResponse.end()
          return
        }
        createReadStream(file).pipe(nodeResponse)
        return
      }
    }
    await writeResponse(
      nodeResponse,
      await app.fetch(toRequest(nodeRequest, requestUrl)),
    )
  })().catch(error => {
    if (!nodeResponse.headersSent) {
      nodeResponse.statusCode = 500
    }
    nodeResponse.end(String(error))
  })
}).listen(port, () => {
  process.stdout.write(`listening on ${origin}\n`)
})

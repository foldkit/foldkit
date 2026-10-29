import { existsSync, realpathSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import type { Connect, PreviewServer } from 'vite'

const isContained = (root: string, file: string): boolean =>
  file.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)

const rewriteDirectoryIndex = (
  request: Connect.IncomingMessage,
  root: string,
  base: string,
  isProxied: (url: string) => boolean,
): void => {
  const { method, headers, url } = request
  if (
    (method !== 'GET' && method !== 'HEAD') ||
    url === undefined ||
    isProxied(url) ||
    isProxied(url.replace(/(\?|$)/, '/index.html$1')) ||
    (headers.accept &&
      !headers.accept.includes('text/html') &&
      !headers.accept.includes('*/*'))
  ) {
    return
  }

  const [pathname = ''] = url.split('?')
  if (
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname.includes('#') ||
    !pathname.startsWith(base)
  ) {
    return
  }

  const route = pathname.slice(base.length)
  if (route === '' || route.endsWith('/')) {
    return
  }

  const segments = route.split('/').map(segment => decodeURIComponent(segment))
  if (
    segments.join('/') !== decodeURI(route) ||
    segments.some(segment => /^\.{1,2}$|[/\\\u0000:]/.test(segment))
  ) {
    return
  }

  const file = resolve(root, ...segments)
  if (
    !isContained(root, file) ||
    file.endsWith('.html') ||
    statSync(file, { throwIfNoEntry: false })?.isFile() ||
    statSync(resolve(file, 'index'), { throwIfNoEntry: false })?.isFile() ||
    existsSync(`${file}.html`)
  ) {
    return
  }

  const index = realpathSync(resolve(file, 'index.html'))
  if (isContained(realpathSync(root), index) && statSync(index).isFile()) {
    request.url = `${pathname}/index.html${url.slice(pathname.length)}`
  }
}

/** @internal Resolve generated directory indexes through Vite's preview pipeline. */
export const installPrerenderPreview = (server: PreviewServer): void => {
  if (server.config.appType === 'custom') {
    return
  }

  const client = server.config.environments['client']
  if (client === undefined) {
    return
  }

  const root = resolve(server.config.root, client.build.outDir)
  const isProxied = (url: string): boolean =>
    Object.entries(server.config.preview.proxy ?? {}).some(
      ([context, options]) =>
        Boolean(options) &&
        (context.startsWith('^')
          ? new RegExp(context).test(url)
          : url.startsWith(context)),
    )

  server.middlewares.use((request, _response, next) => {
    try {
      rewriteDirectoryIndex(request, root, server.config.base, isProxied)
    } catch {
      return next()
    }

    next()
  })
}

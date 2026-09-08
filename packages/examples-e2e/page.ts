import { request as nodeRequest } from 'node:http'

import { type Page, expect } from '@playwright/test'

const collectErrors = (page: Page): Array<string> => {
  const errors: Array<string> = []
  page.on('pageerror', error => {
    errors.push(error.message)
  })
  return errors
}

export const assertLoadedCleanly = async (page: Page): Promise<void> => {
  const errors = collectErrors(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('#root')).toHaveCount(0)
  expect(errors).toEqual([])
}

// An HTTP client that writes the request target into the request line verbatim.
// Every normal client normalizes a URL first, so a target that is not
// origin-form (an absolute URL, or a network-path reference such as
// `//evil.example/page`) can only be sent this way.
export const requestWithTarget = (
  origin: string,
  target: string,
): Promise<Readonly<{ status: number; body: string }>> =>
  new Promise((resolveResponse, reject) => {
    const { hostname, port } = new URL(origin)
    const clientRequest = nodeRequest(
      { hostname, port, path: target, method: 'GET' },
      response => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', chunk => {
          body += chunk
        })
        response.on('end', () =>
          resolveResponse({ status: response.statusCode ?? 0, body }),
        )
      },
    )
    clientRequest.on('error', reject)
    clientRequest.end()
  })

// Hold on to the server-rendered root element as the parser produces it, before
// the client entry runs. Hydration adopts that element in place, so the captured
// node stays connected; a hydration that instead rebuilds replaces it, leaving
// the captured node detached. Without this, a hydration that silently rebuilt
// the whole page on every load would still satisfy every behavioral assertion.
export const captureServerRoot = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const root = document.querySelector('[data-foldkit-app]')
      if (root !== null) {
        Object.assign(window, { __serverRoot: root })
        observer.disconnect()
      }
    })
    observer.observe(document, { childList: true, subtree: true })
  })
}

export const assertAdoptedServerRoot = async (page: Page): Promise<void> => {
  const adoption = await page.evaluate(() => {
    const root = Reflect.get(window, '__serverRoot')
    if (!(root instanceof Element)) {
      return 'the server root was never captured'
    }
    return root.isConnected ? 'adopted' : 'rebuilt'
  })
  expect(adoption).toBe('adopted')
}

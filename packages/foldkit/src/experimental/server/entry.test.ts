// @vitest-environment node
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Rendered, Responded, toResponse } from './entry.js'

const TEMPLATE =
  '<!doctype html><html><head><title>Old</title></head>' +
  '<body><div id="root"></div></body></html>'

const renderedApplication = {
  html: '<main data-foldkit-app="app" data-foldkit-build="fixture">Hello</main>',
  title: 'New',
}

describe('server entry results', () => {
  it('turns rendered markup and HTTP metadata into a Web Response', async () => {
    const response = toResponse(
      TEMPLATE,
      Rendered(renderedApplication, {
        status: 404,
        headers: { 'cache-control': 'private, no-store' },
      }),
    )

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toBe(
      'text/html; charset=utf-8',
    )
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.text()).toContain(
      '<body><main data-foldkit-app="app" data-foldkit-build="fixture">Hello</main></body>',
    )
  })

  it('preserves an explicit rendered content type', () => {
    const response = toResponse(
      TEMPLATE,
      Rendered(renderedApplication, {
        headers: { 'content-type': 'application/xhtml+xml' },
      }),
    )

    expect(response.headers.get('content-type')).toBe('application/xhtml+xml')
  })

  it('turns rendered markup into a document through a renderer', async () => {
    const seen: Array<typeof renderedApplication> = []
    const response = toResponse(application => {
      seen.push(application)
      return `<!doctype html><title>${application.title}</title>${application.html}`
    }, Rendered(renderedApplication))

    expect(seen).toEqual([renderedApplication])
    expect(await response.text()).toBe(
      '<!doctype html><title>New</title><main data-foldkit-app="app" data-foldkit-build="fixture">Hello</main>',
    )
  })

  it('passes a complete response through unchanged without rendering a document', () => {
    const redirect = Response.redirect('https://example.com/login', 307)
    const response = toResponse(() => {
      throw new Error('rendered a document for a complete response')
    }, Responded(redirect))

    expect(response).toBe(redirect)
  })
})

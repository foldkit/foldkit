// @vitest-environment node
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Rendered, Responded, toResponse } from './entry.js'

const TEMPLATE =
  '<!doctype html><html><head><title>Old</title></head>' +
  '<body><div id="root"></div></body></html>'

const application = {
  html: '<main data-foldkit-app="app">Hello</main>',
  title: 'New',
}

describe('server entry results', () => {
  it('turns rendered markup and HTTP metadata into a Web Response', async () => {
    const response = toResponse(
      TEMPLATE,
      Rendered(application, {
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
      '<body><main data-foldkit-app="app">Hello</main></body>',
    )
  })

  it('preserves an explicit rendered content type', () => {
    const response = toResponse(
      TEMPLATE,
      Rendered(application, {
        headers: { 'content-type': 'application/xhtml+xml' },
      }),
    )

    expect(response.headers.get('content-type')).toBe('application/xhtml+xml')
  })

  it('passes a complete response through unchanged', () => {
    const redirect = Response.redirect('https://example.com/login', 307)
    const response = toResponse(TEMPLATE, Responded(redirect))

    expect(response).toBe(redirect)
  })
})

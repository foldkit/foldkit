// @vitest-environment node
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Rendered, Responded } from './entry.js'
import { handleRequest } from './fetch.js'

const TEMPLATE =
  '<!doctype html><html><head><title>Old</title></head>' +
  '<body><div id="root"></div></body></html>'

const ORIGIN = 'http://localhost:3000'

const renderPage = async (request: Request) =>
  Rendered({
    html:
      '<main data-foldkit-app="app" data-foldkit-build="fixture">' +
      `${new URL(request.url).pathname}</main>`,
    title: 'Page',
  })

const handle = (request: Request) =>
  handleRequest(request, { renderPage, template: TEMPLATE, origin: ORIGIN })

describe('handleRequest', () => {
  it('renders a page request into the template', async () => {
    const response = await handle(new Request(`${ORIGIN}/about`))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(
      'text/html; charset=utf-8',
    )
    expect(await response.text()).toContain('>/about</main>')
  })

  it('refuses TRACE instead of forwarding it to the entry', async () => {
    const request = new Request(ORIGIN)
    Object.defineProperty(request, 'method', { value: 'TRACE' })
    const response = await handle(request)

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe(
      'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
    )
  })

  it('refuses a target that names another origin', async () => {
    const response = await handle(new Request('http://evil.example/page'))

    expect(response.status).toBe(400)
  })

  it('uses the platform Request.url when no origin is configured', async () => {
    const response = await handleRequest(
      new Request('https://app.example/about'),
      { renderPage, template: TEMPLATE },
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('>/about</main>')
  })

  it('does not answer a missing hashed asset with the application shell', async () => {
    const response = await handle(new Request(`${ORIGIN}/assets/stale-hash.js`))

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('')
  })

  it('negotiates HTML on a deep link and declares Vary', async () => {
    const page = await handle(
      new Request(`${ORIGIN}/counter/42`, {
        headers: { accept: 'text/html' },
      }),
    )
    expect(page.status).toBe(200)
    expect(page.headers.get('vary')).toContain('Accept')
    expect(page.headers.get('vary')).toContain('Sec-Fetch-Dest')

    const refused = await handle(
      new Request(`${ORIGIN}/counter/42`, {
        headers: { accept: 'application/json' },
      }),
    )
    expect(refused.status).toBe(404)
    expect(refused.headers.get('vary')).toContain('Accept')
  })

  it('returns a complete Response from the entry unchanged', async () => {
    const response = await handleRequest(new Request(`${ORIGIN}/gone`), {
      renderPage: async () => Responded(Response.redirect(`${ORIGIN}/`, 302)),
      template: TEMPLATE,
      origin: ORIGIN,
    })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(`${ORIGIN}/`)
  })

  it('omits the body of a HEAD request', async () => {
    const response = await handle(new Request(`${ORIGIN}/`, { method: 'HEAD' }))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('')
  })
})

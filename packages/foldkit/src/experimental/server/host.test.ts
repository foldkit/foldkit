import { describe, expect, it } from 'vitest'

import {
  acceptsHtml,
  classifyRequest,
  resolveRequestUrl,
  resolvesToIndexHtml,
  varyWith,
  varyWithAccept,
} from './host.js'

describe('acceptsHtml', () => {
  it('accepts an absent or empty header', () => {
    expect(acceptsHtml(undefined)).toBe(true)
    expect(acceptsHtml('')).toBe(true)
    expect(acceptsHtml('   ')).toBe(true)
  })

  it('accepts a browser navigation header', () => {
    expect(
      acceptsHtml(
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ),
    ).toBe(true)
  })

  it('accepts the fetch default and text ranges', () => {
    expect(acceptsHtml('*/*')).toBe(true)
    expect(acceptsHtml('text/*')).toBe(true)
  })

  it('refuses a header that does not cover html', () => {
    expect(acceptsHtml('application/json')).toBe(false)
    expect(acceptsHtml('image/png, application/json')).toBe(false)
  })

  it('refuses text/html with a zero quality even alongside a wildcard', () => {
    expect(acceptsHtml('text/html;q=0')).toBe(false)
    expect(acceptsHtml('text/html;q=0, */*')).toBe(false)
  })

  it('lets the most specific range decide the quality', () => {
    expect(acceptsHtml('text/html;q=0.1, application/json')).toBe(true)
    expect(acceptsHtml('*/*;q=0')).toBe(false)
  })

  it('honors a zero quality when an earlier parameter value is quoted', () => {
    expect(acceptsHtml('text/html;profile="a,b";q=0')).toBe(false)
    expect(acceptsHtml('text/html;profile="a;b";q=0')).toBe(false)
  })

  it('keeps a delimiter quoted through a backslash-escaped quote', () => {
    expect(acceptsHtml('text/html;profile="a\\",b";q=0')).toBe(false)
  })
})

describe('resolvesToIndexHtml', () => {
  it('resolves the root and index.html', () => {
    expect(resolvesToIndexHtml('/')).toBe(true)
    expect(resolvesToIndexHtml('/index.html')).toBe(true)
  })

  it('resolves encoded, dotted, and repeated-separator paths', () => {
    expect(resolvesToIndexHtml('/%2findex.html')).toBe(true)
    expect(resolvesToIndexHtml('/%69ndex.html')).toBe(true)
    expect(resolvesToIndexHtml('/foo/../index.html')).toBe(true)
    expect(resolvesToIndexHtml('//index.html')).toBe(true)
    expect(resolvesToIndexHtml('/INDEX.HTML')).toBe(true)
    expect(resolvesToIndexHtml('/index.html?v=1')).toBe(true)
  })

  it('does not resolve real assets or other routes', () => {
    expect(resolvesToIndexHtml('/assets/app.js')).toBe(false)
    expect(resolvesToIndexHtml('/about')).toBe(false)
    expect(resolvesToIndexHtml('/index.html.map')).toBe(false)
  })

  it('rejects a null-byte path', () => {
    expect(resolvesToIndexHtml('/%00index.html')).toBe(false)
  })
})

describe('varyWithAccept', () => {
  it('sets Accept when there is no existing Vary', () => {
    expect(varyWithAccept(undefined)).toBe('Accept')
    expect(varyWithAccept('')).toBe('Accept')
  })

  it('appends Accept to other field names', () => {
    expect(varyWithAccept('Cookie')).toBe('Cookie, Accept')
    expect(varyWithAccept('cookie, accept-encoding')).toBe(
      'cookie, accept-encoding, Accept',
    )
  })

  it('does not mistake Accept-Language or Accept-Encoding for Accept', () => {
    expect(varyWithAccept('Accept-Language')).toBe('Accept-Language, Accept')
    expect(varyWithAccept('Accept-Encoding')).toBe('Accept-Encoding, Accept')
  })

  it('does not duplicate an existing Accept token in any case', () => {
    expect(varyWithAccept('accept')).toBe('accept')
    expect(varyWithAccept('Cookie, Accept')).toBe('Cookie, Accept')
  })

  it('leaves a wildcard Vary as the wildcard', () => {
    expect(varyWithAccept('*')).toBe('*')
    expect(varyWithAccept('Cookie, *')).toBe('*')
  })
})

describe('resolveRequestUrl', () => {
  const origin = 'http://127.0.0.1:5173'

  it('resolves an origin-form target against the host origin', () => {
    expect(resolveRequestUrl('/page?q=1', origin)).toBe(
      'http://127.0.0.1:5173/page?q=1',
    )
  })

  it('resolves the root target', () => {
    expect(resolveRequestUrl('/', origin)).toBe('http://127.0.0.1:5173/')
  })

  it('refuses a network-path reference that names another origin', () => {
    // `//evil.example/request-info` is a protocol-relative reference: resolving
    // it against the host origin keeps the scheme and takes the authority from
    // the request, handing the entry an origin the client chose.
    expect(
      resolveRequestUrl('//evil.example/request-info', origin),
    ).toBeUndefined()
  })

  it('refuses an absolute-form target that names another origin', () => {
    expect(
      resolveRequestUrl('http://evil.example/request-info', origin),
    ).toBeUndefined()
    expect(
      resolveRequestUrl('https://evil.example/request-info', origin),
    ).toBeUndefined()
  })

  it('accepts an absolute-form target that names the host origin', () => {
    expect(resolveRequestUrl('http://127.0.0.1:5173/page', origin)).toBe(
      'http://127.0.0.1:5173/page',
    )
  })

  it('refuses a target whose port or scheme differs from the host origin', () => {
    expect(
      resolveRequestUrl('http://127.0.0.1:9999/page', origin),
    ).toBeUndefined()
    expect(
      resolveRequestUrl('https://127.0.0.1:5173/page', origin),
    ).toBeUndefined()
  })

  it('resolves against an https origin', () => {
    expect(resolveRequestUrl('/page', 'https://app.example')).toBe(
      'https://app.example/page',
    )
    expect(
      resolveRequestUrl('//evil.example/page', 'https://app.example'),
    ).toBeUndefined()
  })

  it('refuses a hostile Host value that cannot form an origin', () => {
    expect(resolveRequestUrl('/page', 'http://')).toBeUndefined()
    expect(resolveRequestUrl('/page', 'not an origin')).toBeUndefined()
  })
})

describe('classifyRequest', () => {
  it('classifies a hashed script by its path', () => {
    expect(classifyRequest('/assets/stale-hash.js')).toBe('PathAsset')
  })

  it('classifies stylesheets, source maps, and images by their path', () => {
    expect(classifyRequest('/assets/index-abc123.css')).toBe('PathAsset')
    expect(classifyRequest('/assets/index-abc123.js.map')).toBe('PathAsset')
    expect(classifyRequest('/logo.svg')).toBe('PathAsset')
    expect(classifyRequest('/photo.PNG')).toBe('PathAsset')
  })

  it('ignores the query string when reading the extension', () => {
    expect(classifyRequest('/assets/app.js?v=2')).toBe('PathAsset')
  })

  it('reads the path before the fetch destination', () => {
    // A request the URL alone settles must not be made to depend on a header
    // the client may or may not send, or the refusal would need to vary on it.
    expect(classifyRequest('/assets/app.js', 'document')).toBe('PathAsset')
  })

  it('classifies a subresource destination on an extensionless path', () => {
    // A browser fetching a script or stylesheet sends `Accept: */*`, which
    // accepts HTML, so the destination is what separates it from a navigation.
    expect(classifyRequest('/deep/route', 'script')).toBe('DestinationAsset')
    expect(classifyRequest('/deep/route', 'style')).toBe('DestinationAsset')
    expect(classifyRequest('/deep/route', 'image')).toBe('DestinationAsset')
    expect(classifyRequest('/deep/route', 'font')).toBe('DestinationAsset')
  })

  it('classifies a navigation as a page request', () => {
    expect(classifyRequest('/deep/route', 'document')).toBe('Page')
    expect(classifyRequest('/deep/route', 'empty')).toBe('Page')
    expect(classifyRequest('/deep/route')).toBe('Page')
    expect(classifyRequest('/')).toBe('Page')
  })

  it('classifies an html path as a page request', () => {
    expect(classifyRequest('/index.html')).toBe('Page')
    expect(classifyRequest('/about/index.htm')).toBe('Page')
  })

  it('does not read a dot in a directory segment as an extension', () => {
    expect(classifyRequest('/v1.2/route')).toBe('Page')
  })

  it('does not read a dotfile as an extension', () => {
    expect(classifyRequest('/.well-known/foo')).toBe('Page')
  })
})

describe('varyWith', () => {
  it('appends a field name to an existing Vary', () => {
    expect(varyWith('Cookie', 'Sec-Fetch-Dest')).toBe('Cookie, Sec-Fetch-Dest')
  })

  it('preserves existing fields', () => {
    expect(varyWith('Origin, Accept', 'Sec-Fetch-Dest')).toBe(
      'Origin, Accept, Sec-Fetch-Dest',
    )
  })

  it('does not duplicate a field already present in any case', () => {
    expect(varyWith('sec-fetch-dest', 'Sec-Fetch-Dest')).toBe('sec-fetch-dest')
  })

  it('leaves a wildcard Vary alone', () => {
    expect(varyWith('*', 'Sec-Fetch-Dest')).toBe('*')
  })

  it('starts a Vary that does not exist yet', () => {
    expect(varyWith(undefined, 'Sec-Fetch-Dest')).toBe('Sec-Fetch-Dest')
  })
})

describe('resolveRequestUrl credentials', () => {
  it('refuses a target that carries credentials', () => {
    // `URL.origin` ignores userinfo, so this reads as same-origin and then makes
    // `new Request(url)` throw. A malformed request is a 400, not a 500.
    expect(
      resolveRequestUrl(
        'http://user:pass@localhost:3000/page',
        'http://localhost:3000',
      ),
    ).toBeUndefined()
    expect(
      resolveRequestUrl(
        'http://user@localhost:3000/page',
        'http://localhost:3000',
      ),
    ).toBeUndefined()
  })

  it('still accepts the same origin without credentials', () => {
    expect(
      resolveRequestUrl('http://localhost:3000/page', 'http://localhost:3000'),
    ).toBe('http://localhost:3000/page')
  })
})

describe('classifyRequest percent-encoding', () => {
  it('classifies a percent-encoded asset extension as a path asset', () => {
    // A static file server decodes before it looks for a file, so this names the
    // same bundle as `/assets/stale.js`. Reading the raw path would answer a
    // missing bundle with the application shell at 200.
    expect(classifyRequest('/assets/stale%2Ejs')).toBe('PathAsset')
    expect(classifyRequest('/assets/stale.js')).toBe('PathAsset')
  })

  it('leaves an ordinary page a page', () => {
    expect(classifyRequest('/docs/getting-started')).toBe('Page')
  })
})

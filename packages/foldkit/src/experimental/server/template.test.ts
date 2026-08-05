import { describe, expect, it } from 'vitest'

import { injectIntoTemplate } from './template.js'

const TEMPLATE =
  '<!doctype html><html lang="en"><head><title>old</title></head>' +
  '<body><div id="root"></div></body></html>'

const HEAD_TEMPLATE =
  '<!doctype html><html lang="en"><head><title>old</title>' +
  '<link rel="canonical" href="https://example.com/old" />' +
  '<meta property="og:url" content="https://example.com/old" />' +
  '</head><body><div id="root"></div></body></html>'

const rendered = (
  overrides: Partial<Parameters<typeof injectIntoTemplate>[1]> = {},
): Parameters<typeof injectIntoTemplate>[1] => ({
  html: '<div data-foldkit-app="app">hi</div>',
  title: 'New Title',
  ...overrides,
})

describe('injectIntoTemplate', () => {
  it('injects the body and title', () => {
    const result = injectIntoTemplate(TEMPLATE, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain(
      '<body><div data-foldkit-app="app">hi</div></body>',
    )
  })

  it('stamps lang and dir onto <html>, replacing the template lang', () => {
    const result = injectIntoTemplate(
      TEMPLATE,
      rendered({ lang: 'ar', dir: 'rtl' }),
    )
    expect(result).toContain('<html lang="ar" dir="rtl">')
    expect(result).not.toContain('lang="en"')
  })

  it('leaves <html> untouched when lang and dir are omitted', () => {
    const result = injectIntoTemplate(TEMPLATE, rendered())
    expect(result).toContain('<html lang="en">')
  })

  it('inserts a $ sequence in the body verbatim', () => {
    const result = injectIntoTemplate(
      TEMPLATE,
      rendered({ html: '<div>price $5 & rising $&amp; $`</div>' }),
    )
    expect(result).toContain('<div>price $5 & rising $&amp; $`</div>')
  })

  it('escapes the title text', () => {
    const result = injectIntoTemplate(
      TEMPLATE,
      rendered({ title: 'Fish & <Chips>' }),
    )
    expect(result).toContain('<title>Fish &amp; &lt;Chips&gt;</title>')
  })

  it('replaces the canonical href and the og:url content', () => {
    const result = injectIntoTemplate(
      HEAD_TEMPLATE,
      rendered({
        canonical: 'https://example.com/fresh',
        ogUrl: 'https://example.com/fresh',
      }),
    )
    expect(result).toContain(
      '<link rel="canonical" href="https://example.com/fresh" />',
    )
    expect(result).toContain(
      '<meta property="og:url" content="https://example.com/fresh" />',
    )
    expect(result).not.toContain('https://example.com/old')
  })

  it('leaves the canonical and og:url template values in place when the render omits them', () => {
    const result = injectIntoTemplate(HEAD_TEMPLATE, rendered())
    expect(result).toContain(
      '<link rel="canonical" href="https://example.com/old" />',
    )
    expect(result).toContain(
      '<meta property="og:url" content="https://example.com/old" />',
    )
  })

  it('leaves the template untouched at that spot when the head element is absent', () => {
    const result = injectIntoTemplate(
      TEMPLATE,
      rendered({ canonical: 'https://example.com/fresh' }),
    )
    expect(result).not.toContain('canonical')
  })

  it('escapes an attribute-breaking canonical value', () => {
    const result = injectIntoTemplate(
      HEAD_TEMPLATE,
      rendered({ canonical: 'https://example.com/?a="b"' }),
    )
    expect(result).toContain('href="https://example.com/?a=&quot;b&quot;"')
  })

  it('rejects a container that carries extra attributes', () => {
    const template =
      '<html><head><title>t</title></head>' +
      '<body><div id="root" class="page"></div></body></html>'
    expect(() => injectIntoTemplate(template, rendered())).toThrow(
      'no exact <div id="root"></div> placeholder',
    )
  })

  it('replaces a custom container id when passed', () => {
    const template =
      '<html><head><title>t</title></head>' +
      '<body><div id="app-shell"></div></body></html>'
    const result = injectIntoTemplate(template, rendered(), {
      containerId: 'app-shell',
    })
    expect(result).toContain(
      '<body><div data-foldkit-app="app">hi</div></body>',
    )
  })

  it('throws when the template has no matching container', () => {
    const template = '<html><head><title>t</title></head><body></body></html>'
    expect(() => injectIntoTemplate(template, rendered())).toThrow(
      'no exact <div id="root"></div> placeholder',
    )
  })

  it('throws when the template has more than one matching container', () => {
    const template =
      '<html><head><title>t</title></head>' +
      '<body><div id="root"></div><div id="root"></div></body></html>'
    expect(() => injectIntoTemplate(template, rendered())).toThrow(
      'more than one <div id="root"></div> placeholder',
    )
  })

  it('throws when the template has no title element', () => {
    const template =
      '<html><head></head><body><div id="root"></div></body></html>'
    expect(() => injectIntoTemplate(template, rendered())).toThrow(
      'no <title> element',
    )
  })

  it('throws when the template has more than one title element', () => {
    const template =
      '<html><head><title>one</title><title>two</title></head>' +
      '<body><div id="root"></div></body></html>'
    expect(() => injectIntoTemplate(template, rendered())).toThrow(
      'more than one <title> element',
    )
  })
})

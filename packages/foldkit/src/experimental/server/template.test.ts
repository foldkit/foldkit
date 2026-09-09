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
  html: '<div data-foldkit-app="app" data-foldkit-build="build-one">hi</div>',
  title: 'New Title',
  ...overrides,
})

describe('injectIntoTemplate', () => {
  it('injects the body and title', () => {
    const result = injectIntoTemplate(TEMPLATE, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain(
      '<body><div data-foldkit-app="app" data-foldkit-build="build-one">hi</div></body>',
    )
  })

  it('rejects a template with a duplicate container id', () => {
    const template =
      '<!doctype html><html lang="en"><head><title>old</title></head>' +
      '<body><div id="root"></div><aside id="root"></aside></body></html>'
    expect(() => injectIntoTemplate(template, rendered())).toThrow(
      /more than one element with id="root"/,
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

  it('rejects a template with no explicit <html> tag when lang or dir is requested', () => {
    const template =
      '<!doctype html><head><title>old</title></head>' +
      '<body><div id="root"></div></body>'
    expect(() =>
      injectIntoTemplate(template, rendered({ lang: 'fr' })),
    ).toThrow(/no explicit <html> start tag/)
  })

  it('injects a template with no explicit <html> tag when lang and dir are omitted', () => {
    const template =
      '<!doctype html><head><title>old</title></head>' +
      '<body><div id="root"></div></body>'
    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain(
      '<div data-foldkit-app="app" data-foldkit-build="build-one">hi</div>',
    )
  })

  it('replaces a single-quoted template lang without duplicating the attribute', () => {
    const template =
      "<!doctype html><html lang='en'><head><title>old</title></head>" +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered({ lang: 'ar' }))
    expect(result).toContain('<html lang="ar">')
    expect(result).not.toContain("lang='en'")
  })

  it('replaces an unquoted template lang without duplicating the attribute', () => {
    const template =
      '<!doctype html><html lang=en><head><title>old</title></head>' +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered({ lang: 'ar' }))
    expect(result).toContain('<html lang="ar">')
    expect(result).not.toContain('lang=en')
  })

  it('keeps an attribute whose value contains the stamped attribute name intact', () => {
    const template =
      '<!doctype html><html data-note="my lang here"><head><title>old</title></head>' +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered({ lang: 'en' }))
    expect(result).toContain('<html data-note="my lang here" lang="en">')
    expect(result.match(/lang="en"/g)).toHaveLength(1)
  })

  it('replaces only the canonical href, keeping sibling attributes intact', () => {
    const template =
      '<!doctype html><html><head><title>old</title>' +
      '<link rel="canonical" title="site href list" href="https://example.com/old" />' +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(
      template,
      rendered({ canonical: 'https://example.com/fresh' }),
    )
    expect(result).toContain(
      '<link rel="canonical" title="site href list" href="https://example.com/fresh" />',
    )
    expect(result.match(/href=/g)).toHaveLength(1)
    expect(result).not.toContain('https://example.com/old')
  })

  it('replaces only the head title, leaving an SVG title in the body alone', () => {
    const template =
      '<!doctype html><html><head><title>old</title></head>' +
      '<body><svg><title>icon label</title></svg><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain('<svg><title>icon label</title></svg>')
    expect(result).not.toContain('<title>old</title>')
  })

  it('stamps past a commented-out canonical onto the real one, leaving the comment untouched', () => {
    const template =
      '<!doctype html><html><head><title>old</title>' +
      '<!-- <link rel="canonical" href="https://example.com/old" /> -->' +
      '<link rel="canonical" href="https://example.com/current" />' +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(
      template,
      rendered({ canonical: 'https://example.com/fresh' }),
    )
    expect(result).toContain(
      '<!-- <link rel="canonical" href="https://example.com/old" /> -->',
    )
    expect(result).toContain(
      '<link rel="canonical" href="https://example.com/fresh" />',
    )
    expect(result).not.toContain('https://example.com/current')
  })

  it('stamps the head even when a comment contains a closing head tag', () => {
    const template =
      '<!doctype html><html><head>' +
      '<!-- do not remove </head> without updating the shell -->' +
      '<title>old</title></head>' +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain(
      '<!-- do not remove </head> without updating the shell -->',
    )
  })

  it('finds the real head when a leading comment contains a head open tag', () => {
    const template =
      '<!doctype html><html><!-- <head> was reworked in v2 -->' +
      '<head><title>old</title></head>' +
      '<body><svg><title>icon label</title></svg><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain('<svg><title>icon label</title></svg>')
  })

  it('rewrites the real canonical, not the canonical-looking string in a head script', () => {
    const scriptBlock =
      '<script>const fallback = \'<link rel="canonical" href="x">\'</script>'
    const template =
      '<!doctype html><html><head><title>old</title>' +
      scriptBlock +
      '<link rel="canonical" href="https://example.com/current" />' +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(
      template,
      rendered({ canonical: 'https://example.com/fresh' }),
    )
    expect(result).toContain(scriptBlock)
    expect(result).toContain(
      '<link rel="canonical" href="https://example.com/fresh" />',
    )
    expect(result).not.toContain('https://example.com/current')
  })

  it('treats a script closed by an attributed end tag as inert', () => {
    const scriptBlock =
      '<script>const fallback = \'<link rel="canonical" href="x">\'</script ignored>'
    const template =
      '<!doctype html><html><head><title>old</title>' +
      scriptBlock +
      '<link rel="canonical" href="https://example.com/current" />' +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(
      template,
      rendered({ canonical: 'https://example.com/fresh' }),
    )
    expect(result).toContain(scriptBlock)
    expect(result).toContain(
      '<link rel="canonical" href="https://example.com/fresh" />',
    )
    expect(result).not.toContain('https://example.com/current')
  })

  it('treats a script closed by a self-closing end tag as inert', () => {
    const scriptBlock = "<script>const t = '<title>fake</title>'</script/>"
    const template =
      '<!doctype html><html><head>' +
      scriptBlock +
      '<title>old</title></head>' +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain(scriptBlock)
  })

  it('finds the real head title past a head-looking string in a script', () => {
    const template =
      '<!doctype html><html><head>' +
      "<script>const markup = '<title>fake</title></head>'</script>" +
      '<title>old</title></head>' +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain(
      "<script>const markup = '<title>fake</title></head>'</script>",
    )
  })

  it('ignores a canonical-looking string in a script whose open tag has a quoted >', () => {
    const scriptBlock =
      '<script data-x="a>b">const c = \'<link rel="canonical" href="x">\'</script>'
    const template =
      '<!doctype html><html><head><title>old</title>' +
      scriptBlock +
      '<link rel="canonical" href="https://example.com/current" />' +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(
      template,
      rendered({ canonical: 'https://example.com/fresh' }),
    )
    expect(result).toContain(scriptBlock)
    expect(result).toContain(
      '<link rel="canonical" href="https://example.com/fresh" />',
    )
  })

  it('ignores head-looking strings in a double-escaped script', () => {
    const scriptBlock =
      '<script><!--<script>const c = \'<link rel="canonical" href="x">\';</script>--></script>'
    const template =
      '<!doctype html><html><head><title>old</title>' +
      scriptBlock +
      '<link rel="canonical" href="https://example.com/current" />' +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(
      template,
      rendered({ canonical: 'https://example.com/fresh' }),
    )
    expect(result).toContain(scriptBlock)
    expect(result).toContain(
      '<link rel="canonical" href="https://example.com/fresh" />',
    )
  })

  it('replaces the real container, not a container-looking string in a script', () => {
    const scriptBlock =
      '<script>const placeholder = \'<div id="root"></div>\';</script>'
    const template =
      '<!doctype html><html><head><title>old</title>' +
      scriptBlock +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain(scriptBlock)
    expect(result).toContain(
      '<body><div data-foldkit-app="app" data-foldkit-build="build-one">hi</div></body>',
    )
  })

  it('stamps the real html lang, leaving an html-looking comment untouched', () => {
    const comment = '<!-- example shell: <html lang=""> -->'
    const template =
      '<!doctype html><html lang="en"><head>' +
      comment +
      '<title>old</title></head>' +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered({ lang: 'ar' }))
    expect(result).toContain('<html lang="ar">')
    expect(result).toContain(comment)
  })

  it('escapes an attribute-breaking lang value into the html element', () => {
    const result = injectIntoTemplate(
      TEMPLATE,
      rendered({ lang: 'en" onload="evil()' }),
    )
    expect(result).toContain('<html lang="en&quot; onload=&quot;evil()">')
    expect(result).not.toContain('onload="evil()"')
  })

  it('stamps single-quoted canonical and og:url head elements', () => {
    const template =
      '<!doctype html><html><head><title>old</title>' +
      "<link rel='canonical' href='https://example.com/old' />" +
      "<meta property='og:url' content='https://example.com/old' />" +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(
      template,
      rendered({
        canonical: 'https://example.com/fresh',
        ogUrl: 'https://example.com/fresh',
      }),
    )
    expect(result).toContain('href="https://example.com/fresh"')
    expect(result).toContain('content="https://example.com/fresh"')
    expect(result).not.toContain('https://example.com/old')
  })

  it('inserts a $ sequence in the body verbatim', () => {
    const result = injectIntoTemplate(
      TEMPLATE,
      rendered({ html: '<div>price $5 & rising $&amp; $`</div>' }),
    )
    expect(result).toContain('<div>price $5 & rising $&amp; $`</div>')
  })

  it('rejects a hand-authored hydratable root the fragment parser drops', () => {
    expect(() =>
      injectIntoTemplate(
        TEMPLATE,
        rendered({
          html: '<td data-foldkit-app="app" data-foldkit-build="build-one">cell</td>',
        }),
      ),
    ).toThrow(/does not survive parsing|reshapes before insertion/)
  })

  it('rejects a hand-authored hydratable root the fragment parser splits', () => {
    expect(() =>
      injectIntoTemplate(
        TEMPLATE,
        rendered({
          html:
            '<p data-foldkit-app="app" data-foldkit-build="build-one">' +
            '<div id="escaped">x</div></p>',
        }),
      ),
    ).toThrow(/reshapes before insertion|insert or reconstruct nodes/)
  })

  it('rejects significant content beside a hydratable root', () => {
    expect(() =>
      injectIntoTemplate(
        TEMPLATE,
        rendered({
          html: 'lead<div data-foldkit-app="app" data-foldkit-build="build-one">root</div>tail',
        }),
      ),
    ).toThrow(/ambiguous Foldkit root or Flags markers/)
  })

  it('rejects non-ASCII whitespace beside a hydratable root', () => {
    for (const extra of ['\u00a0', '&nbsp;']) {
      expect(() =>
        injectIntoTemplate(
          TEMPLATE,
          rendered({
            html:
              '<div data-foldkit-app="app" data-foldkit-build="build-one">root</div>' +
              extra,
          }),
        ),
      ).toThrow(/ambiguous Foldkit root or Flags markers/)
    }
  })

  it('rejects non-ASCII whitespace as a second static root', () => {
    expect(() =>
      injectIntoTemplate(
        TEMPLATE,
        rendered({ html: '<div>static</div>\u00a0' }),
      ),
    ).toThrow(/more than one top-level node/)
  })

  it('rejects a forged render containing a live base element', () => {
    expect(() =>
      injectIntoTemplate(
        TEMPLATE,
        rendered({
          html:
            '<div data-foldkit-app="app" data-foldkit-build="build-one">' +
            '<base href="https://evil.example/base/">' +
            '</div>',
        }),
      ),
    ).toThrow(/contains a live HTML <base> element/)
  })

  it('rejects a hydratable root without a nonempty build marker', () => {
    expect(() =>
      injectIntoTemplate(
        TEMPLATE,
        rendered({ html: '<div data-foldkit-app="app"></div>' }),
      ),
    ).toThrow(/nonempty data-foldkit-build marker/)
  })

  it('accepts one matching top-level Flags payload', () => {
    const result = injectIntoTemplate(
      TEMPLATE,
      rendered({
        html:
          '<div data-foldkit-app="app" data-foldkit-build="build-one">root</div>' +
          '<script type="application/json" data-foldkit-flags="app">{"locale":"en"}</script>',
      }),
    )

    expect(result).toContain(
      '<script type="application/json" data-foldkit-flags="app">{"locale":"en"}</script>',
    )
  })

  it('accepts legitimate empty, text, and comment static output', () => {
    for (const html of ['', 'plain text', '\u00a0', '<!--empty-->']) {
      expect(() =>
        injectIntoTemplate(TEMPLATE, rendered({ html })),
      ).not.toThrow()
    }
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
      '<body><div data-foldkit-app="app" data-foldkit-build="build-one">hi</div></body>',
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

describe('injectIntoTemplate insertion context', () => {
  const pageWithPlaceholderIn = (open: string, close: string): string =>
    '<!doctype html><html lang="en"><head><title>old</title></head>' +
    `<body>${open}<div id="root"></div>${close}</body></html>`

  const UNSUPPORTED = /not a supported insertion context/

  it('rejects a placeholder inside a form', () => {
    // The supported contexts are stated rather than inferred: a placeholder
    // reached from the body through plain flow containers parses the way the
    // rendered markup was already validated against, and anything else is
    // refused instead of modeled.
    expect(() =>
      injectIntoTemplate(
        pageWithPlaceholderIn('<form>', '</form>'),
        rendered({
          html: '<form data-foldkit-app="app" data-foldkit-build="build-one">hi</form>',
        }),
      ),
    ).toThrow(UNSUPPORTED)
  })

  it('rejects a placeholder inside a table', () => {
    expect(() =>
      injectIntoTemplate(
        pageWithPlaceholderIn(
          '<table><tbody><tr><td>',
          '</td></tr></tbody></table>',
        ),
        rendered(),
      ),
    ).toThrow(UNSUPPORTED)
  })

  it('rejects a placeholder inside foreign content', () => {
    for (const [open, close] of [
      ['<svg><foreignObject>', '</foreignObject></svg>'],
      ['<math><mtext>', '</mtext></math>'],
    ]) {
      expect(() =>
        injectIntoTemplate(
          pageWithPlaceholderIn(open ?? '', close ?? ''),
          rendered(),
        ),
      ).toThrow(UNSUPPORTED)
    }
  })

  it('rejects a placeholder inside a paragraph or a list item', () => {
    // A `<p>` cannot hold the placeholder at all, and a `<li>` is not a
    // container the contract names.
    expect(() =>
      injectIntoTemplate(
        pageWithPlaceholderIn('<ul><li>', '</li></ul>'),
        rendered(),
      ),
    ).toThrow(UNSUPPORTED)
  })

  it('rejects a placeholder inside a select or template, which drop it outright', () => {
    for (const [open, close] of [
      ['<select>', '</select>'],
      ['<template>', '</template>'],
    ]) {
      expect(() =>
        injectIntoTemplate(
          pageWithPlaceholderIn(open ?? '', close ?? ''),
          rendered(),
        ),
      ).toThrow(/placeholder/)
    }
  })

  it('accepts a placeholder in the body and in plain flow containers', () => {
    for (const [open, close] of [
      ['', ''],
      ['<main>', '</main>'],
      ['<main><div class="shell">', '</div></main>'],
      ['<div><section><article>', '</article></section></div>'],
    ]) {
      const result = injectIntoTemplate(
        pageWithPlaceholderIn(open ?? '', close ?? ''),
        rendered(),
      )
      expect(result).toContain(
        '<div data-foldkit-app="app" data-foldkit-build="build-one">hi</div>',
      )
    }
  })

  it('accepts a placeholder in the second of two same-tag siblings', () => {
    // An ordinary template. Resolving the path by tag name alone would compare
    // the injection against the first section and reject a valid page.
    const template =
      '<!doctype html><html lang="en"><head><title>old</title></head>' +
      '<body><main><section><p>First</p></section>' +
      '<section><div id="root"></div></section></main></body></html>'

    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain(
      '<section><div data-foldkit-app="app" data-foldkit-build="build-one">hi</div></section>',
    )
  })

  it('does not validate against an earlier same-tag sibling', () => {
    // The earlier section holds static markup that looks like the rendered
    // output. Resolving the path by tag name alone would find that one and
    // accept a page whose real injection is somewhere else entirely.
    const template =
      '<!doctype html><html lang="en"><head><title>old</title></head>' +
      '<body><section><div class="lookalike">hi</div></section>' +
      '<section><div id="root"></div><p>tail</p></section></body></html>'

    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain(
      '<section><div data-foldkit-app="app" data-foldkit-build="build-one">hi</div><p>tail</p></section>',
    )
  })

  it('rejects a template whose placeholder is swallowed with scripting disabled', () => {
    // With scripting enabled the noscript content is raw text and the page
    // parses as written. With scripting disabled the unterminated textarea
    // swallows the placeholder and everything after it, so a visitor without
    // JavaScript gets no application root and no shell tail.
    const template =
      '<!doctype html><html><head><title>Old</title></head><body>' +
      '<noscript><textarea></noscript>' +
      '<div id="root"></div><p id="tail">Tail</p>' +
      '</body></html>'

    expect(() =>
      injectIntoTemplate(
        template,
        rendered({
          html: '<main data-foldkit-app="app" data-foldkit-build="build-one">Application</main>',
        }),
      ),
    ).toThrow(/does not survive/)
  })

  it('rejects rendered markup that declares a shadow root', () => {
    // A browser turns a declarative shadow root into a real one while parsing,
    // moving its content out of the light DOM. Neither this check's parser nor
    // hydration's probe reproduces that, so it is refused rather than modeled.
    for (const attribute of ['shadowrootmode="open"', 'shadowroot="open"']) {
      expect(() =>
        injectIntoTemplate(
          pageWithPlaceholderIn('', ''),
          rendered({
            html:
              '<div data-foldkit-app="app" data-foldkit-build="build-one" id="host">' +
              `<template ${attribute}><span id="shadow">Shadow</span></template>` +
              '</div>',
          }),
        ),
      ).toThrow(/declares a shadow root/)
    }
  })

  it('rejects rendered markup that mutates the document around it', () => {
    // `injectIntoTemplate` takes any RenderedApplication a caller hands it,
    // including one this process did not render, so the same refusal stands
    // here as well as at the render.
    expect(() =>
      injectIntoTemplate(
        pageWithPlaceholderIn('', ''),
        rendered({
          html:
            '<div data-foldkit-app="app" data-foldkit-build="build-one">' +
            '<html data-inner-html="yes"><body data-inner-body="yes"><p>Inside</p></body></html>' +
            '</div>',
        }),
      ),
    ).toThrow(/changes the document it is placed into/)
  })

  it('rejects a shadow root nested inside an ordinary template', () => {
    // The scan descends into template content, where a declaration would
    // otherwise sit in a fragment the walk never entered.
    expect(() =>
      injectIntoTemplate(
        pageWithPlaceholderIn('', ''),
        rendered({
          html:
            '<div data-foldkit-app="app" data-foldkit-build="build-one">' +
            '<template><template shadowrootmode="open"><span>Shadow</span></template></template>' +
            '</div>',
        }),
      ),
    ).toThrow(/declares a shadow root/)
  })

  it('rejects a shadow root a browser only reaches with scripting disabled', () => {
    // <noscript> content is raw text while scripting is enabled and live markup
    // when it is not, so a single-mode parse reads this as a harmless string.
    expect(() =>
      injectIntoTemplate(
        pageWithPlaceholderIn('', ''),
        rendered({
          html:
            '<div data-foldkit-app="app" data-foldkit-build="build-one">' +
            '<noscript><template shadowrootmode="open"><span>Shadow</span></template></noscript>' +
            '</div>',
        }),
      ),
    ).toThrow(/declares a shadow root/)
  })

  it('accepts an ordinary template element in rendered markup', () => {
    const result = injectIntoTemplate(
      pageWithPlaceholderIn('', ''),
      rendered({
        html: '<div data-foldkit-app="app" data-foldkit-build="build-one"><template><span>x</span></template></div>',
      }),
    )
    expect(result).toContain('<template><span>x</span></template>')
  })

  it('validates static output that carries no hydration contract', () => {
    // Nothing will adopt this markup, so a dropped subtree is simply lost with
    // no hydration to rebuild it. That is a reason to check it, not to skip it.
    expect(() =>
      injectIntoTemplate(
        pageWithPlaceholderIn('<form id="outer">', '</form>'),
        rendered({ html: '<form id="inner"><input name="q"></form>' }),
      ),
    ).toThrow(UNSUPPORTED)
  })

  it('accepts static output in a supported context', () => {
    const result = injectIntoTemplate(
      pageWithPlaceholderIn('<main>', '</main>'),
      rendered({ html: '<div>static</div>' }),
    )
    expect(result).toContain('<main><div>static</div></main>')
  })

  it('rejects a second injection beside an existing hydratable root', () => {
    const template =
      '<!doctype html><html lang="en"><head><title>old</title></head>' +
      '<body><div data-foldkit-app="app-a" data-foldkit-build="build-zero">existing</div>' +
      '<div id="root"></div></body></html>'

    expect(() =>
      injectIntoTemplate(
        template,
        rendered({
          html: '<div data-foldkit-app="app-b" data-foldkit-build="build-one">hi</div>',
        }),
      ),
    ).toThrow('page already holds a server-rendered application')
  })
})

describe('runtime id uniqueness', () => {
  const twoRootTemplate =
    '<!doctype html><html><head><title>t</title></head><body>' +
    '<div id="first"></div><div id="second"></div></body></html>'

  it('refuses a second application stamped with the same runtime id', () => {
    // A runtime id names one application for the whole page. Injecting two
    // default renders produced a page whose roots both answered to "app", so
    // whichever booted second would read the other's Flags payload and restore
    // the other's HMR Model and scroll position.
    const first = injectIntoTemplate(
      twoRootTemplate,
      rendered({
        html: '<div data-foldkit-app="app" data-foldkit-build="build-one">first</div>',
      }),
      { containerId: 'first' },
    )

    expect(() =>
      injectIntoTemplate(
        first,
        rendered({
          html: '<div data-foldkit-app="app" data-foldkit-build="build-one">second</div>',
        }),
        { containerId: 'second' },
      ),
    ).toThrow(/already holds a root with that id/)
  })

  it('refuses a duplicate id for applications that declare no Flags', () => {
    // The pairing is only one of the things a runtime id decides. HMR Model
    // preservation and scroll restoration key on it too, so two Flags-free
    // applications sharing one still take each other's state.
    const first = injectIntoTemplate(
      twoRootTemplate,
      rendered({
        html: '<main data-foldkit-app="app" data-foldkit-build="build-one">first</main>',
      }),
      { containerId: 'first' },
    )

    expect(() =>
      injectIntoTemplate(
        first,
        rendered({
          html: '<main data-foldkit-app="app" data-foldkit-build="build-one">second</main>',
        }),
        { containerId: 'second' },
      ),
    ).toThrow(/already holds a root with that id/)
  })

  it('refuses ambiguous markers inside a rendered application', () => {
    for (const html of [
      '<div data-foldkit-app="app" data-foldkit-build="build-one"><span data-foldkit-app="app"></span></div>',
      '<div data-foldkit-app="app" data-foldkit-build="build-one"></div>' +
        '<script type="application/json" data-foldkit-flags="app"></script>' +
        '<script type="application/json" data-foldkit-flags="app"></script>',
      '<div><script type="application/json" data-foldkit-flags="app"></script></div>',
    ]) {
      expect(() =>
        injectIntoTemplate(twoRootTemplate, rendered({ html }), {
          containerId: 'first',
        }),
      ).toThrow(/ambiguous Foldkit root or Flags markers/)
    }
  })

  it('refuses a template Flags payload that already claims the runtime id', () => {
    const template =
      '<!doctype html><html><head><title>t</title></head><body>' +
      '<script type="application/json" data-foldkit-flags="app">{}</script>' +
      '<div id="root"></div></body></html>'

    expect(() =>
      injectIntoTemplate(
        template,
        rendered({
          html: '<div data-foldkit-app="app" data-foldkit-build="build-one">next</div>',
        }),
      ),
    ).toThrow(/already holds a Flags payload/)
  })

  it('refuses a second application with a distinct runtime id', () => {
    const first = injectIntoTemplate(
      twoRootTemplate,
      rendered({
        html: '<div data-foldkit-app="alpha" data-foldkit-build="build-one">first</div>',
      }),
      { containerId: 'first' },
    )

    expect(() =>
      injectIntoTemplate(
        first,
        rendered({
          html: '<div data-foldkit-app="beta" data-foldkit-build="build-one">second</div>',
        }),
        { containerId: 'second' },
      ),
    ).toThrow('page already holds a server-rendered application')
  })

  it('allows static output after one hydratable application', () => {
    const withApplication = injectIntoTemplate(
      twoRootTemplate,
      rendered({
        html: '<div data-foldkit-app="app" data-foldkit-build="build-one">application</div>',
      }),
      { containerId: 'first' },
    )
    const injected = injectIntoTemplate(
      withApplication,
      rendered({ html: '<div>static</div>' }),
      { containerId: 'second' },
    )

    expect(injected).toContain('>application</div>')
    expect(injected).toContain('<div>static</div>')
  })

  it('allows one hydratable application after static output', () => {
    const withStaticOutput = injectIntoTemplate(
      twoRootTemplate,
      rendered({ html: '<div>static</div>' }),
      { containerId: 'first' },
    )
    const injected = injectIntoTemplate(
      withStaticOutput,
      rendered({
        html: '<div data-foldkit-app="app" data-foldkit-build="build-one">application</div>',
      }),
      { containerId: 'second' },
    )

    expect(injected).toContain('<div>static</div>')
    expect(injected).toContain('>application</div>')
  })
})

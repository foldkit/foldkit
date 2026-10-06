// @vitest-environment node
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { DocumentAssets, renderDocument } from './document.js'

const assets = DocumentAssets.make({
  entryScript: '/assets/app.js',
  stylesheets: ['/assets/app.css'],
  modulePreloads: ['/assets/vendor.js'],
})

const renderedApplication = {
  html: '<main data-foldkit-app="app" data-foldkit-build="fixture">Hello</main>',
  title: 'Page',
}

describe('renderDocument', () => {
  it('renders application metadata, escaped assets, and author-owned head markup', () => {
    const document = renderDocument(
      {
        ...renderedApplication,
        title: 'A <title> & more',
        lang: 'en" data-injected="yes',
        dir: 'rtl',
        canonical: 'https://example.com/page?label="main"&view=full',
        ogUrl: 'https://example.com/page?source=one&source=two',
      },
      DocumentAssets.make({
        entryScript: '/assets/app.js?label="main"&mode=fast',
        stylesheets: ['/assets/app.css?theme="dark"&mode=full'],
        modulePreloads: ['/assets/vendor.js?part="shared"&mode=full'],
      }),
      {
        lang: 'fr',
        head: '<meta name="theme-color" content="#fff">',
      },
    )

    expect(document).toContain('<title>A &lt;title&gt; &amp; more</title>')
    expect(document).toContain(
      '<html lang="en&quot; data-injected=&quot;yes" dir="rtl">',
    )
    expect(document).not.toContain('<html lang="fr"')
    expect(document).toContain(
      'href="https://example.com/page?label=&quot;main&quot;&amp;view=full"',
    )
    expect(document).toContain(
      'content="https://example.com/page?source=one&amp;source=two"',
    )
    expect(document).toContain('<meta name="theme-color" content="#fff">')
    expect(document).toContain(
      'href="/assets/app.css?theme=&quot;dark&quot;&amp;mode=full"',
    )
    expect(document).toContain(
      'href="/assets/vendor.js?part=&quot;shared&quot;&amp;mode=full"',
    )
    expect(document).toContain(
      'src="/assets/app.js?label=&quot;main&quot;&amp;mode=fast"',
    )
  })

  it('preserves the rendered root and Flags payload for hydration', () => {
    const application = {
      ...renderedApplication,
      html:
        '<main data-foldkit-app="counter" data-foldkit-build="fixture">Hello</main>' +
        '<script type="application/json" data-foldkit-flags="counter">{"count":1}</script>',
    }

    const document = renderDocument(application, assets, { lang: 'fr' })

    expect(document).toContain(application.html)
    expect(document).toContain('<html lang="fr">')
    expect(document).toContain(
      '<script type="module" crossorigin src="/assets/app.js"></script>',
    )
  })

  it('rejects application markup with ambiguous roots or handoff markers', () => {
    expect(() =>
      renderDocument(
        {
          ...renderedApplication,
          html: `${renderedApplication.html}<aside>Extra root</aside>`,
        },
        assets,
      ),
    ).toThrow(/ambiguous Foldkit root or Flags markers/)
  })
})

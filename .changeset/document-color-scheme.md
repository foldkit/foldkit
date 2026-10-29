---
'foldkit': minor
---

Add `colorScheme` to the `Document` a `makeApplication` view returns, so the page declares which color schemes it supports from the Model. The value is the new `ColorScheme` Schema from `foldkit/html`: `Normal`, `Light`, `Dark`, `LightDark`, `DarkLight`, `OnlyLight`, or `OnlyDark`, written as the lowercase `content` of `<meta name="color-scheme">` (`light dark`, `only dark`, and so on).

```ts
const view = (model: Model): Document => ({
  title: 'Settings',
  colorScheme: model.colorScheme,
  body: settingsView(model),
})
```

The browser runtime writes the meta after each render and reuses a served one instead of adding a second. A later omission restores the served value or removes the element the runtime created, as for `canonical`. `Server.renderToString` returns the value as `colorScheme`, and `Server.renderDocument` writes the meta after the `<title>` and before the `head` option markup and every stylesheet, so a request-time render can serve a visitor's scheme, read from a cookie and passed in Flags, from the first paint. `injectIntoTemplate` replaces the `content` of a template's `<meta name="color-scheme">` and leaves a template without one unchanged; the runtime creates that element after boot.

The runtime matches served `<meta name="color-scheme">`, `<link rel="canonical">`, and `<meta property="og:url">` elements case-insensitively, as `injectIntoTemplate` does. A served element whose identity attribute uses uppercase letters, such as `rel="Canonical"`, is reused and normalized instead of being duplicated.

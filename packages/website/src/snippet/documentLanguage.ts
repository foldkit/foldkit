import type { TextDirection } from 'foldkit/html'

import { ApplicationComposition } from './composition'

// TRANSLATION

const translate = (locale: Locale, key: string): string => {
  // Your catalog lookup. Foldkit does not ship translation.
  return catalog[locale][key] ?? key
}

const languageTag: Readonly<Record<Locale, string>> = {
  English: 'en',
  Arabic: 'ar',
  Japanese: 'ja',
}

const textDirection: Readonly<Record<Locale, TextDirection>> = {
  English: 'Ltr',
  Arabic: 'Rtl',
  Japanese: 'Ltr',
}

const view = ApplicationComposition.makeView((model, h) => ({
  title: translate(model.locale, 'PageTitle'),
  lang: languageTag[model.locale],
  dir: textDirection[model.locale],
  body: h.div(
    [h.Class('mx-auto max-w-prose p-6')],
    [
      h.h1([], [translate(model.locale, 'PageTitle')]),
      localePicker(model.locale, h),
    ],
  ),
}))

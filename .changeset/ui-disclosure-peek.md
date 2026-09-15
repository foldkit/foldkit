---
'@foldkit/ui': minor
---

Let `Disclosure`'s `animatePanel` keep a peek of the collapsed panel in view.

`animatePanel(content, { peek: '7.5em' })` holds the collapsed panel at that height and shows an inert visual preview of its content, so preview-style disclosures can use the same height transition an all-or-nothing panel gets. Every collapsed animated panel is now inert and hidden from assistive technology until it opens.

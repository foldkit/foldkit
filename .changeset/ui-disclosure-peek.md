---
'@foldkit/ui': minor
---

Let `Disclosure`'s `animatePanel` keep a peek of the collapsed panel in view.

`animatePanel(content, { peek: '7.5em' })` holds the collapsed panel at that height and shows the top of its content, so a "read more" fold can use the same height transition an all-or-nothing panel gets. A peeking panel is real content while collapsed, so it is not marked `aria-hidden`; without `peek` nothing changes.

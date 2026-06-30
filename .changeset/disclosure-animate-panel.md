---
'@foldkit/ui': minor
---

Add `animatePanel` to the `Ui.Disclosure` attribute bundle, so disclosures can
animate their expand and collapse. It wraps panel content in a CSS-grid
container that transitions height (`grid-template-rows: 0fr → 1fr` with
`overflow: hidden`), keeping the panel mounted while collapsed so the transition
has something to animate from and to. Render the panel unconditionally and pass
it through `attributes.animatePanel` instead of gating it on `isOpen`. The
collapsed content is marked `aria-hidden`. Mirrors the `Ui.Animation`
`animateSize` flag.

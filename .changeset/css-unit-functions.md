---
'foldkit': minor
'@foldkit/ui': minor
---

Add `foldkit/css`, a set of unit functions that turn a number into one canonical CSS value string. `h.Style` takes strings, so a view that computes a style value used to format it by hand, and a template literal prints numbers the way JavaScript does: `${0.3 + index * 0.08}s` at index 2 renders `0.45999999999999996s`. A Scene test that asserted `'0.46s'` failed, so it had to copy the view's formatting to pass.

The `Css` namespace, also exported from `foldkit`, has one function per unit: `number`, `percent`, `px`, `em`, `rem`, `ch`, `vw`, `vh`, `vmin`, `vmax`, `fr`, `deg`, `rad`, `turn`, `s` and `ms`. The names mirror the numeric factory functions of CSS Typed OM. Each returns a plain string, so it goes into `h.Style`, into template literals such as `translate3d(...)` and `calc(...)`, and into `toHaveStyle`.

Every function writes at most four decimal places, removes trailing zeros, and writes `-0` as `0`. `Css.s(0.3 + 2 * 0.08)` is `'0.46s'` and `Css.percent(100 / 3)` is `'33.3333%'`. Only magnitudes of at least `1e21` use exponent form.

Every function also takes an optional `step`, which rounds the value to the nearest multiple of the step before formatting, the way CSS `round(nearest, value, step)` does. A value exactly halfway between two multiples rounds toward positive infinity. Most decimal steps are not exact in binary, so a value that looks halfway can sit just below the midpoint: `Css.number(0.15, { step: 0.1 })` is `'0.1'`. Foldkit skips a style write when the rendered string is unchanged, so `Css.number(opacity, { step: 0.01 })` lets an animated value cause a DOM write and a repaint only when it crosses to a new hundredth.

A value that is not finite throws instead of rendering `NaNpx`, as does a step that is not a finite number greater than 0 and a rounded result that is not finite. Each message starts with `[foldkit] Css.<name>`, for example `[foldkit] Css.px received NaN. CSS numeric values must be finite.`

A Scene test can now assert a numeric style with the literal string or with the same call the view makes: `toHaveStyle('--row-delay', '0.46s')` and `toHaveStyle('--row-delay', Css.s(0.3 + 2 * 0.08))` both pass. `toHaveStyle` still compares strings exactly.

`@foldkit/ui` now formats its computed style values with `Css`. The slider writes its filled-track width and thumb position to four decimal places instead of two, for example `33.3333%` instead of `33.33%`. The virtual list, toast, drag and drop and anchor, along with Foldkit's scroll lock, no longer write floating-point noise such as `0.30000000000000004px`. Integer values render as before.

Because `Css` throws on a value that is not finite, some invalid `@foldkit/ui` inputs that used to fail silently now fail loudly. A Slider `value` of `NaN` and a VirtualList `rowHeightPx` of `0` used to render `NaN%` or `NaNpx`, which the browser dropped; now the view throws and the render stops. An `anchor.padding` or Popover `arrowPadding` of `NaN` used to write `NaNpx` and still show the panel; now the anchor logs `[@foldkit/ui] anchorSetup could not position the panel` and the panel keeps the visibility its caller rendered, which is hidden until positioned. An `anchor.gap` of `NaN` is unaffected, because Floating UI treats it as `0`.

`@foldkit/ui` now imports `foldkit/css`, so its `foldkit` peer dependency rises from `>=0.163.0` to `>=0.164.0`. Upgrade both packages together; upgrading `@foldkit/ui` alone now produces a peer dependency warning instead of a module link error.

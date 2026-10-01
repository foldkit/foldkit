# CSS Values

`foldkit/css` turns numbers into CSS value strings. Each function takes a number and returns one canonical string, so `Css.px(12)` is `'12px'` and `Css.s(0.3 + 2 * 0.08)` is `'0.46s'`. The same call works in a view, in a template literal, and in a test.

## Why the Functions Exist

`h.Style` takes strings, so a numeric style value has to be formatted somewhere. The obvious template literal formats it the way JavaScript prints numbers. Say a list staggers each row's entrance by its index:

```text
`${0.3 + index * 0.08}s`  at index 2  →  '0.45999999999999996s'
```

The browser accepts that value, but it is not what anyone meant to write. A Scene test that asserts `'0.46s'` fails, so the test has to copy the view's arithmetic and formatting byte for byte to pass.

`Css.s(0.3 + index * 0.08)` renders `'0.46s'`. The test asserts `'0.46s'`, or makes the same `Css.s` call, and no longer depends on how the view formatted the number.

## The Unit Functions

Import `Css` from `foldkit`, or import the functions from `foldkit/css`. There is one function per unit:

| Function      | Output for `12` |
| ------------- | --------------- |
| `Css.number`  | `'12'`          |
| `Css.percent` | `'12%'`         |
| `Css.px`      | `'12px'`        |
| `Css.em`      | `'12em'`        |
| `Css.rem`     | `'12rem'`       |
| `Css.ch`      | `'12ch'`        |
| `Css.vw`      | `'12vw'`        |
| `Css.vh`      | `'12vh'`        |
| `Css.vmin`    | `'12vmin'`      |
| `Css.vmax`    | `'12vmax'`      |
| `Css.fr`      | `'12fr'`        |
| `Css.deg`     | `'12deg'`       |
| `Css.rad`     | `'12rad'`       |
| `Css.turn`    | `'12turn'`      |
| `Css.s`       | `'12s'`         |
| `Css.ms`      | `'12ms'`        |

The names follow the numeric factory functions of CSS Typed OM, such as `CSS.px()` and `CSS.percent()`. The difference is that these return plain strings, which is what `h.Style` takes.

::Snippet{name="cssUnits" label="unit functions code"}

## The Format

Every function writes the number the same way:

- At most four decimal places, with trailing zeros removed. `33.333333333333336` is written `'33.3333'` and `2` is written `'2'`.
- Floating-point noise disappears. `0.1 + 0.2` is written `'0.3'`.
- Negative zero, and anything that rounds to zero, is written `'0'`.
- Exponent form appears only for magnitudes of at least `1e21`, as JavaScript's `String` does.

A value that is not finite has no CSS spelling. Every function throws for `NaN`, `Infinity`, and `-Infinity` instead of rendering `'NaNpx'`, which the browser would silently drop. A throw inside a view stops the render, so the bug surfaces where the value is computed:

```text
[foldkit] Css.px received NaN. CSS numeric values must be finite.
```

## Rounding to a Step

Every function takes an optional `step`. The value is rounded to the nearest multiple of the step before the format runs, so `Css.number(0.4312, { step: 0.01 })` is `'0.43'`.

Use `step` to limit style writes while a value animates. Foldkit skips a style write when the rendered string is the same as the last one. Picture a backdrop whose opacity follows a pointer. Without a step, almost every frame produces a new string like `'0.4312'`, `'0.4318'`, `'0.4325'`, and each one is a DOM write and a repaint. With `{ step: 0.01 }`, those frames all render `'0.43'`, and Foldkit writes the style once.

::Snippet{name="cssStep" label="step code"}

A value exactly halfway between two multiples rounds toward positive infinity: `0.25` with a step of `0.5` is `'0.5'`, and `-0.25` is `'0'`. This is how CSS `round(nearest, value, step)` rounds, and it matches `Math.round`. Most decimal steps are not exact in binary, so a value that looks halfway can sit just below the midpoint: `0.15` with a step of `0.1` is `'0.1'`, not `'0.2'`. A step finer than four decimal places still ends in the four-decimal format.

The step must be a finite number greater than 0. Any other step throws, and so does a rounded result that is not finite:

```text
[foldkit] Css.number received step 0. A step must be a finite number greater than 0.
[foldkit] Css.number cannot round 1e+300 to step 1e-10. The rounded value is not finite.
```

## Composing Values

The result is a plain string, so it goes anywhere a CSS value string goes. Put it inside a template literal to build `transform` functions or `calc()` expressions:

::Snippet{name="cssTransform" label="composition code"}

## Asserting with toHaveStyle

`toHaveStyle` compares the rendered value exactly. When the view formats a number with `Css`, assert the literal string, or make the same `Css` call in the test:

::Snippet{name="cssToHaveStyle" label="Scene test code"}

Both assertions pass. Neither one repeats the view's template literal.

## API Reference

See the [API reference](/api-reference/css) for the signature of every function and the `Options` type.

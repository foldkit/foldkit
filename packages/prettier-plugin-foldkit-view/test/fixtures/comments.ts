// Top-level comment.
const a = [1, /* between */ 2, 3]

const b = [
  // own-line leading
  1,
  2,
]

const c = [1, 2 /* trailing on element */, 3]

// Dangling comments inside otherwise-empty containers.
const d = [
  /* dangling */
]
const e = foo(/* dangling */)
const f = {
  /* dangling */
}

// Inline trailing on the call argument.
const g = div(
  [Class('foo')], // attributes
  [text('hello')],
)

// Block comment between siblings inside an array.
const h = [
  Class('a'),
  /* between attributes */
  Id('b'),
]

const foo = (...x: ReadonlyArray<unknown>) => x
const div = (...x: ReadonlyArray<unknown>) => x
const text = (s: string) => s
const Class = (s: string) => s
const Id = (s: string) => s

void [a, b, c, d, e, f, g, h, foo, div, text, Class, Id]

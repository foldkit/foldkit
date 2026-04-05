---
'foldkit': minor
---

Add RTL-parity locators to the Scene testing API: `Scene.altText`, `Scene.title`, `Scene.testId`, and `Scene.displayValue` (plus their underlying `getByAltText`, `getByTitle`, `getByTestId`, `getByDisplayValue` query functions). These match the React Testing Library queries of the same names — useful for finding images by `alt` text, elements by `title` tooltip, elements by `data-testid`, and form controls by their current value.

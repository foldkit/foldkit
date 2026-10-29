---
'foldkit': patch
---

Server rendering parses each page fewer times. `renderToString` and `injectIntoTemplate` check every page by parsing it back with parse5, and on a large page those parses took most of each request. When neither the rendered markup nor the template contains `<noscript>`, rendering a page and injecting it into a template now parses the whole page 6 times, and each `h.InnerHTML` fragment twice. On a page of several hundred kilobytes that roughly halves the time the two calls take.

Markup that contains the text `<noscript` anywhere, in any letter case and including inside an attribute value or a comment, is still parsed with scripting both enabled and disabled, because `<noscript>` content parses differently in the two modes.

Every check and every error message is unchanged, and the rendered and injected HTML is the same byte for byte.

---
'foldkit': patch
---

Percent-encode path segment values when building a URL and decode them when parsing, so every value a router builds parses back to the same route. `literal`, `string`, `int`, `param`, and `schemaSegment` share one encoder and decoder.

Before, these parsers printed values as written. A `string('id')` value of `a/b` built `/users/a/b`, which parsed as a different route or as not-found. `/evil.example` built `/users//evil.example`, and `x?tab=1` ended the path at `x` and started a query string. Values with spaces or non-ASCII text came back from the browser percent-encoded, so the route received `caf%C3%A9` instead of `café`.

Now `a/b` builds `/users/a%2Fb` and parses back to `a/b`. The same holds for `?`, `#`, `%`, spaces, and non-ASCII text. `literal('café')` builds and matches `/caf%C3%A9`. A segment with a malformed percent escape, such as `%E0%A4%A`, does not match, so `parseUrlWithFallback` returns the not-found route.

Building a URL fails with a `ParseError` when a segment value is empty, `.`, or `..`, because browsers drop or resolve those segments and no URL parses back to them. This is the same way `restString` refuses a path that would not round-trip. `schemaSegment` no longer logs a development warning for an encoded value containing a slash, because that value is now one encoded segment.

Values made of letters, digits, and `-_.!~*'()` build the same URLs as before. `rest`, `restString`, and `query` are unchanged. An app that decoded parsed segment values itself should remove that decoding, because the route now carries the decoded value.

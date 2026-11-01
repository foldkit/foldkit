---
'foldkit': patch
---

`Url.fromString` keeps a second `?` in the query and a second `#` in the fragment. A cold load of `https://app.example.com/login?next=/units?page=2#section#sub` used to drop `page=2` and `#sub`, while the same URL reached by a later navigation kept both.

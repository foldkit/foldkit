// Building URLs from route data - same router, opposite direction!

const homeUrl = homeRouter()
console.log(homeUrl)
// '/'

const peopleUrl = peopleRouter({ searchText: Option.none() })
console.log(peopleUrl)
// '/people'

const searchUrl = peopleRouter({
  searchText: Option.some('alice'),
})
console.log(searchUrl)
// '/people?searchText=alice'

const personUrl = personRouter({ personId: 42 })
console.log(personUrl)
// '/people/42'

// Use in your view to create type-safe links:
a([Href(personRouter({ personId: person.id }))], [person.name])

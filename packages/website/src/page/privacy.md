# Foldkit Privacy Policy

_Last updated: August 2026._

## The Short Version

foldkit.dev is a documentation site for an open source framework. It has no accounts, no login, and no advertising. Nothing you read here is tied to an identity, and nothing collected on this site is sold or shared with advertisers.

The only personal information the site ever handles is an email address, and only if you type one into the newsletter form yourself.

## What the Site Collects

**Analytics.** The site uses Vercel Web Analytics and Vercel Speed Insights. They record page views and page load measurements in aggregate. They set no cookies and build no cross-site profile of a visitor. What comes back is which pages get read and how fast they load.

**Server logs.** The site is hosted on Vercel, which keeps standard request logs. A log line holds the requested URL, a timestamp, the user agent, and an IP address, which is what any web server needs to serve a request and to absorb abuse.

**Nothing else.** There is no session tracking, no fingerprinting, no third-party advertising or social tracking pixel, and no A/B testing framework.

## What Stays in Your Browser

Two values live in your browser's local storage and never leave it, outside the playground:

- `theme-preference` holds your light, dark, or system theme choice.
- `foldkit-sidebar-state` holds which documentation sidebar sections you left open.

Documentation search runs entirely in your browser through Pagefind. Search terms are never sent to a server.

## The Newsletter

The newsletter form posts your email address to [Buttondown](https://buttondown.com), the mailing list provider, which stores it and sends the mail. Foldkit uses it only to send release notes and occasional deep dives. Every message carries an unsubscribe link, and unsubscribing removes the address.

Submitting the form is the only way an email address reaches Foldkit through this site.

## The Playground

The in-browser [playground](/playground) runs a real development server inside your browser tab using WebContainer, a StackBlitz technology. It manages its own browser storage for the virtual file system and the packages it caches, which is the one place on this site where something other than the two values above is stored. Your code runs locally in that tab. Booting the environment downloads the example's npm dependencies from the public npm registry, which means those requests reach npm and StackBlitz infrastructure the same way any package install does. Nothing you type in the playground is uploaded to Foldkit.

## The Content API

The [Content API](/api) and the other machine-readable documents are public, unauthenticated, and read-only. They need no key and no registration, so using them involves no personal data beyond the standard request logs described above.

## Third Parties

The site depends on these services, each of which publishes its own privacy policy: [Vercel](https://vercel.com) for hosting and analytics, [Buttondown](https://buttondown.com) for the newsletter, [StackBlitz](https://stackblitz.com) for the playground runtime, and [npm](https://www.npmjs.com) for the packages the playground installs. GitHub, Discord, and X are linked from the site but load nothing into these pages.

## Your Choices

Unsubscribe from the newsletter using the link in any message. Clear the two local storage values by clearing site data for foldkit.dev in your browser. Block the analytics scripts with any content blocker, and the site still works, since analytics is not load bearing.

## Changes and Questions

Changes to this page ship as ordinary commits in the [public repository](https://github.com/foldkit/foldkit/blob/main/packages/website/src/page/privacy.md), so the history of this policy is the file's history. Questions about privacy go to the channels on the [contact page](/contact).

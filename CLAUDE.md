# michaelmoser.dev

## Code

- No code comments. The code documents itself; reasoning belongs in the commit message or PR.
- Test only logic we write. Everything in `lib/` is tested; nothing outside `lib/` gets its own
  tests. Third-party behavior is exercised only at the integration level, never tested directly.

## Publishing

- Anything on `main` is published, because a push to `main` deploys.
- Drafts live on local, unpushed feature branches.
- URLs are permanent. A published URL is never removed or changed; if content must move, the old
  URL gets a permanent redirect.

## Content

- Post content is pure, portable markdown. No template shortcodes, no template syntax.

## Privacy

- No plain contact email address anywhere in the built output.
- No phone number.
- Location is never more specific than "Montana".

## Pre-publish checklist for Uplisting and AirDNA posts

- No revenue figures.
- No customer names.
- No vendor-identifying security details.

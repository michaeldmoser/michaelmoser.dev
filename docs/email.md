# Email

The domain receives mail through Cloudflare Email Routing and sends none of its own. Routing
rules live in the Cloudflare dashboard rather than in this repo; this file is the record of what
is configured there.

Dashboard: zone `michaelmoser.dev` → Email → Email Routing.

## Published address

`reachoutto@michaelmoser.dev` is the only address ever published. The site never renders it as
plain text.

## Forwarders

Every forwarder delivers to the verified Gmail destination (see Email Routing → Destination
addresses). The destination address is deliberately not recorded in this public repo.

| Address                       |
| ----------------------------- |
| `reachoutto@michaelmoser.dev` |

Dash and dot variants such as `reach-out-to@` were considered and left out. Cloudflare, unlike
Gmail, treats each spelling as a different address, so mail to a variant bounces. Visitors reach
the address through the site's mail link rather than retyping it, so the extra rules weren't
worth maintaining.

## Catch-all

Disabled, by design. A catch-all invites spam to every guessable address. Mail to any address
without a rule is rejected with a 550 bounce.

## DNS records

| Name                      | Type | Value                                            | Set by              |
| ------------------------- | ---- | ------------------------------------------------ | ------------------- |
| `michaelmoser.dev`        | MX   | `route1.mx.cloudflare.net` (and `route2`, `route3`) | Email Routing    |
| `michaelmoser.dev`        | TXT  | `v=spf1 include:_spf.mx.cloudflare.net ~all`     | Email Routing       |
| `cf2024-1._domainkey.michaelmoser.dev` | TXT | DKIM public key (`v=DKIM1; h=sha256; k=rsa; p=…`) | Email Routing |
| `_dmarc.michaelmoser.dev` | TXT  | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` | added by hand       |

Leave the SPF record as Cloudflare wrote it; Email Routing's status check expects it.

The DMARC policy rejects any mail claiming to come from `@michaelmoser.dev`, which is correct
while the domain sends nothing. It has no `rua` reporting address, since that would need its own
forwarder.

**If sending as the domain is ever added** (for example, Gmail's "Send mail as" through an SMTP
relay), revisit both records first: SPF must authorize the sending service, and DMARC at
`p=reject` with strict alignment will otherwise reject the outgoing mail.

## Adding a forwarder

1. Open the Cloudflare dashboard → zone `michaelmoser.dev` → Email → Email Routing → Routing
   rules.
2. Under Custom addresses, choose Create address.
3. Enter the local part (the part before `@`), choose the action Send to an email, and pick the
   verified Gmail destination.
4. Save, and confirm the new rule shows as enabled.
5. Send a test message to it from a non-Gmail account. Gmail hides a forwarded copy of mail sent
   from the destination account itself, so a self-test looks like a failure.
6. Add the address to the Forwarders table above, and commit.

---
title: "Retries are a design decision"
date: 2026-10-30
description: "Where a retry belongs, how many is too many, and who decides."
draft: true
---

A retry is a promise about time. Somebody has to decide how long the caller is willing to wait, and that somebody is usually nobody.

## One request, two attempts

![Sequence diagram: the client posts to the API, the provider returns 503, the API retries after two seconds and gets 201](retry-sequence.svg)

::: tradeoff
Retrying inside the API hides a provider blip from the client, but it also spends the client's timeout budget without telling them.
:::

## A budget, not a count

```ts
const deadline = Date.now() + 5_000
while (Date.now() < deadline) {
  const response = await provider.create(booking)
  if (response.ok) return response
  await sleep(backoff(attempt++))
}
```

::: tip
Log every retry with the attempt number. The day you need it, you will need it badly.
:::

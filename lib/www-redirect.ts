export function redirectToApex(request: Request, apexOrigin: string): Response {
  const { pathname, search } = new URL(request.url)
  return new Response(null, {
    status: 301,
    headers: { Location: `${apexOrigin}${pathname}${search}` }
  })
}

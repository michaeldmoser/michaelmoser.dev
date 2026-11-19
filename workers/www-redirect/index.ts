import { redirectToApex } from '../../lib/www-redirect.ts'
import { url } from '../../src/_data/site.json'

export default {
  fetch(request: Request): Response {
    return redirectToApex(request, url)
  }
}

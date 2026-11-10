const POST_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC'
})

export function formatPostDate(date: Date): string {
  return POST_DATE_FORMAT.format(date)
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

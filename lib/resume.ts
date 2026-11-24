export interface Role {
  name: string
  position: string
  dateRange: string
  location?: string
  description?: string
  highlights: { text: string; href?: string; printUrl?: string }[]
}

export interface Resume {
  summary: string
  work: Role[]
  skills: { name: string; keywords: string[] }[]
  earlier: { name: string; position: string; years: string }[]
  education: {
    institution: string
    studyType?: string
    area?: string
    years?: string
  }[]
}

export interface ResumeContext {
  postSlugs: ReadonlySet<string>
  siteUrl: string
}

interface RawHighlight {
  text: string
  post?: string
}

interface RawRole {
  name: string
  position: string
  startDate: string
  endDate?: string
  location?: string
  description?: string
  highlights?: (string | RawHighlight)[]
}

type RawDate = string | number

interface RawEarlier {
  name: string
  position: string
  startDate?: RawDate
  endDate?: RawDate
}

interface RawEducation {
  institution: string
  studyType?: string
  area?: string
  startDate?: RawDate
  endDate?: RawDate
}

interface RawResume {
  basics: { summary: string }
  work: RawRole[]
  skills?: { name: string; keywords?: string[] }[]
  earlier?: RawEarlier[]
  education?: RawEducation[]
}

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

function formatMonth(date: string): string {
  const [year, month] = String(date).split('-')
  return `${months[Number(month) - 1]} ${year}`
}

function shapeRole(role: RawRole, siteUrl: string): Role {
  const end = role.endDate ? formatMonth(role.endDate) : 'Present'
  return {
    name: role.name,
    position: role.position,
    dateRange: `${formatMonth(role.startDate)} – ${end}`,
    location: role.location,
    description: role.description,
    highlights: (role.highlights ?? []).map((highlight) =>
      typeof highlight === 'string'
        ? { text: highlight }
        : {
            text: highlight.text,
            href: highlight.post ? `/writing/${highlight.post}/` : undefined,
            printUrl: highlight.post
              ? `${siteUrl}/writing/${highlight.post}/`
              : undefined
          }
    )
  }
}

function yearsOf(startDate?: RawDate, endDate?: RawDate): string | undefined {
  const years = [startDate, endDate]
    .filter((date) => date !== undefined)
    .map((date) => String(date).slice(0, 4))
  return years.length > 0 ? years.join('–') : undefined
}

function unknownPostViolations(
  work: RawRole[],
  postSlugs: ReadonlySet<string>
): string[] {
  return work.flatMap((role) =>
    (role.highlights ?? []).flatMap((highlight) =>
      typeof highlight !== 'string' &&
      highlight.post &&
      !postSlugs.has(highlight.post)
        ? [
            `work ${role.name} — ${role.position}: post "${highlight.post}" does not exist`
          ]
        : []
    )
  )
}

type Entry = Record<string, unknown>

interface Section {
  name: string
  nameField: string
  hasPosition: boolean
  required: string[]
  datePattern?: RegExp
  extraProblems?: ((entry: Entry) => string[])[]
}

const monthOnly = /^\d{4}-(0[1-9]|1[0-2])$/
const yearOrMonth = /^\d{4}(-(0[1-9]|1[0-2]))?$/
const dateFields = ['startDate', 'endDate']

const highlightKeys = ['text', 'post']

function highlightProblems(entry: Entry): string[] {
  const highlights = entry.highlights
  if (!Array.isArray(highlights)) {
    return []
  }
  const count =
    highlights.length >= 1 && highlights.length <= 5
      ? []
      : [`highlights has ${highlights.length} items, expected 1 to 5`]
  const shapes = highlights.flatMap((highlight) => {
    if (typeof highlight === 'string') {
      return []
    }
    const object = (highlight ?? {}) as Entry
    const missing = object.text ? [] : ['highlight text is missing']
    const extra = Object.keys(object)
      .filter((key) => !highlightKeys.includes(key))
      .map((key) => `highlight has unexpected key "${key}"`)
    return [...missing, ...extra]
  })
  return [...count, ...shapes]
}

const allowedLocations = new Set([
  'Remote',
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming'
])

function locationProblems(entry: Entry): string[] {
  const location = entry.location
  if (location === undefined || location === null) {
    return []
  }
  return typeof location === 'string' && allowedLocations.has(location)
    ? []
    : [`location "${String(location)}" is not Remote or a full US state name`]
}

const sections: Section[] = [
  {
    name: 'work',
    nameField: 'name',
    hasPosition: true,
    required: ['name', 'position', 'startDate', 'highlights'],
    datePattern: monthOnly,
    extraProblems: [highlightProblems, locationProblems]
  },
  {
    name: 'skills',
    nameField: 'name',
    hasPosition: false,
    required: ['name', 'keywords']
  },
  {
    name: 'earlier',
    nameField: 'name',
    hasPosition: true,
    required: ['name', 'position', 'startDate', 'endDate'],
    datePattern: yearOrMonth
  },
  {
    name: 'education',
    nameField: 'institution',
    hasPosition: false,
    required: ['institution'],
    datePattern: yearOrMonth
  }
]

function entryLabel(section: Section, entry: Entry, index: number): string {
  const name = entry[section.nameField]
  const position = section.hasPosition ? entry.position : undefined
  const identified =
    Boolean(name) && (!section.hasPosition || Boolean(position))
  const head = identified ? section.name : `${section.name}[${index}]`
  const who = [name, position].filter(Boolean).join(' — ')
  return who ? `${head} ${who}` : head
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

function problemOf(entry: Entry, field: string): string | undefined {
  const value = entry[field]
  if (isBlank(value)) {
    return `${field} is missing`
  }
  if (field === 'keywords' && Array.isArray(value) && value.length === 0) {
    return 'keywords is empty'
  }
  return undefined
}

function dateText(value: unknown): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value)
}

function dateProblem(
  entry: Entry,
  field: string,
  pattern: RegExp
): string | undefined {
  const value = entry[field]
  if (isBlank(value)) {
    return undefined
  }
  const text = dateText(value)
  const valid =
    (typeof value === 'string' || typeof value === 'number') &&
    pattern.test(text)
  return valid ? undefined : `${field} "${text}" is not a valid date`
}

function orderProblem(entry: Entry, pattern: RegExp): string | undefined {
  const [start, end] = dateFields.map((field) =>
    isBlank(entry[field]) || dateProblem(entry, field, pattern)
      ? undefined
      : dateText(entry[field])
  )
  if (start === undefined || end === undefined) {
    return undefined
  }
  const precision = Math.min(start.length, end.length)
  return end.slice(0, precision) < start.slice(0, precision)
    ? `endDate "${end}" is before startDate "${start}"`
    : undefined
}

function entryViolations(
  section: Section,
  entry: Entry,
  index: number
): string[] {
  const problems = [
    ...section.required.map((field) => problemOf(entry, field)),
    ...dateFields.map((field) =>
      section.datePattern
        ? dateProblem(entry, field, section.datePattern)
        : undefined
    ),
    section.datePattern ? orderProblem(entry, section.datePattern) : undefined,
    ...(section.extraProblems ?? []).flatMap((check) => check(entry))
  ]
  const label = entryLabel(section, entry, index)
  return problems.flatMap((problem) =>
    problem ? [`${label}: ${problem}`] : []
  )
}

function currentRoleViolations(raw: Record<string, unknown>): string[] {
  const workSection = sections.find((section) => section.name === 'work')
  const current = ((raw.work ?? []) as Entry[])
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => isBlank(entry.endDate))
  if (!workSection || current.length < 2) {
    return []
  }
  return current.map(
    ({ entry, index }) =>
      `${entryLabel(workSection, entry, index)}: endDate is missing but ${current.length} roles are current; only one role may be current`
  )
}

function requiredFieldViolations(raw: Record<string, unknown>): string[] {
  const basics = (raw.basics ?? {}) as Entry
  const summary = basics.summary ? [] : ['basics: summary is missing']
  return [
    ...summary,
    ...sections.flatMap((section) =>
      ((raw[section.name] ?? []) as Entry[]).flatMap((entry, index) =>
        entryViolations(section, entry, index)
      )
    )
  ]
}

export function checkResume(
  raw: unknown,
  context: ResumeContext
): { resume: Resume | null; violations: string[] } {
  const { basics, work, skills, earlier, education } = raw as RawResume
  const violations = [
    ...requiredFieldViolations(raw as Record<string, unknown>),
    ...currentRoleViolations(raw as Record<string, unknown>),
    ...unknownPostViolations(work ?? [], context.postSlugs)
  ]
  if (violations.length > 0) {
    return { resume: null, violations }
  }
  const newestFirst = [...work].sort((a, b) =>
    String(b.startDate).localeCompare(String(a.startDate))
  )
  return {
    resume: {
      summary: basics.summary,
      work: newestFirst.map((role) => shapeRole(role, context.siteUrl)),
      skills: (skills ?? []).map((group) => ({
        name: group.name,
        keywords: group.keywords ?? []
      })),
      earlier: (earlier ?? []).map((role) => ({
        name: role.name,
        position: role.position,
        years: yearsOf(role.startDate, role.endDate) ?? ''
      })),
      education: (education ?? []).map((entry) => ({
        institution: entry.institution,
        studyType: entry.studyType,
        area: entry.area,
        years: yearsOf(entry.startDate, entry.endDate)
      }))
    },
    violations
  }
}

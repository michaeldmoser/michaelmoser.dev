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

function shapeRole(role: RawRole): Role {
  const end = role.endDate ? formatMonth(role.endDate) : 'Present'
  return {
    name: role.name,
    position: role.position,
    dateRange: `${formatMonth(role.startDate)} – ${end}`,
    location: role.location,
    description: role.description,
    highlights: (role.highlights ?? []).map((highlight) => ({
      text: typeof highlight === 'string' ? highlight : highlight.text
    }))
  }
}

function yearsOf(startDate?: RawDate, endDate?: RawDate): string | undefined {
  const years = [startDate, endDate]
    .filter((date) => date !== undefined)
    .map((date) => String(date).slice(0, 4))
  return years.length > 0 ? years.join('–') : undefined
}

export function checkResume(
  raw: unknown,
  _context: ResumeContext
): { resume: Resume | null; violations: string[] } {
  const { basics, work, skills, earlier, education } = raw as RawResume
  const newestFirst = [...work].sort((a, b) =>
    String(b.startDate).localeCompare(String(a.startDate))
  )
  return {
    resume: {
      summary: basics.summary,
      work: newestFirst.map(shapeRole),
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
    violations: []
  }
}

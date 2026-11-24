import type { Resume } from '../lib/resume.ts'

export default class Experience {
  data() {
    return {
      layout: 'layouts/base.11ty.tsx',
      title: 'Experience',
      permalink: '/experience/'
    }
  }

  render(data: { collections: { resume: Resume } }) {
    const { summary, work, skills, earlier, education } =
      data.collections.resume
    return (
      <>
        <h1>Experience</h1>
        <p>{summary}</p>
        {work.map((role) => (
          <section>
            <h2>{role.name}</h2>
            <p>{role.position}</p>
            <p>{role.dateRange}</p>
            {role.location ? <p>{role.location}</p> : null}
            {role.description ? <p>{role.description}</p> : null}
            <ul>
              {role.highlights.map((highlight) => (
                <li>{highlight.text}</li>
              ))}
            </ul>
          </section>
        ))}
        {skills.map((group) => (
          <section>
            <h2>{group.name}</h2>
            <ul>
              {group.keywords.map((keyword) => (
                <li>{keyword}</li>
              ))}
            </ul>
          </section>
        ))}
        <section>
          <h2>Earlier experience</h2>
          {earlier.map((role) => (
            <p>
              {role.name}, {role.position}, {role.years}
            </p>
          ))}
        </section>
        {education.length > 0 ? (
          <section>
            <h2>Education</h2>
            {education.map((entry) => (
              <p>
                {[entry.institution, entry.studyType, entry.area, entry.years]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            ))}
          </section>
        ) : null}
      </>
    )
  }
}

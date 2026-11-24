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
          <section class='resume-role'>
            <h2>{role.name}</h2>
            <p class='resume-meta'>{role.position}</p>
            <p class='resume-meta'>{role.dateRange}</p>
            {role.location ? <p class='resume-meta'>{role.location}</p> : null}
            {role.description ? (
              <p class='resume-meta'>{role.description}</p>
            ) : null}
            <ul>
              {role.highlights.map((highlight) => (
                <li>
                  {highlight.href ? (
                    <a
                      href={highlight.href}
                      data-print-url={highlight.printUrl}
                    >
                      {highlight.text}
                    </a>
                  ) : (
                    highlight.text
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {skills.map((group) => (
          <section class='resume-role'>
            <h2>{group.name}</h2>
            <ul class='resume-skills'>
              {group.keywords.map((keyword) => (
                <li>{keyword}</li>
              ))}
            </ul>
          </section>
        ))}
        <section class='resume-role'>
          <h2>Earlier experience</h2>
          {earlier.map((role) => (
            <p>
              {role.name}, {role.position}, {role.years}
            </p>
          ))}
        </section>
        {education.length > 0 ? (
          <section class='resume-role'>
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

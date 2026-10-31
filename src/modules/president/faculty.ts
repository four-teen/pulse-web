export type EducationRecord = {
  degree: string
  institution: string
  specialization: string
  status: string
}

export type FacultyProfile = {
  id: number
  fullName: string
  campus: string
  college: string
  rank: string
  education: { bachelor: EducationRecord; master: EducationRecord; doctoral: EducationRecord }
  updatedAt: string | null
}

export type FacultyProfilePage = {
  schemaVersion: 1
  sourceId: 'sinq'
  mode: 'local_test' | 'production'
  status: 'disabled' | 'configuration_required' | 'awaiting_sync' | 'connected'
  observedAt: string | null
  facultyProfiles: FacultyProfile[]
  pagination: { total: number; limit: number; offset: number }
}

export function parseFacultyProfilePage(input: unknown): FacultyProfilePage {
  function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Faculty profiles could not be read.')
    return value as Record<string, unknown>
  }
  function text(value: unknown, max: number): value is string { return typeof value === 'string' && value.length <= max }
  function timestamp(value: unknown, nullable = true): value is string | null {
    return value === null ? nullable : typeof value === 'string' && Number.isFinite(Date.parse(value))
  }
  const data = object(input)
  const pagination = object(data.pagination)
  if (data.schemaVersion !== 1 || data.sourceId !== 'sinq' || !['local_test', 'production'].includes(String(data.mode))
    || !['disabled', 'configuration_required', 'awaiting_sync', 'connected'].includes(String(data.status))
    || !timestamp(data.observedAt) || !Array.isArray(data.facultyProfiles)
    || !Number.isInteger(pagination.total) || (pagination.total as number) < 0
    || !Number.isInteger(pagination.limit) || (pagination.limit as number) < 1 || (pagination.limit as number) > 100
    || !Number.isInteger(pagination.offset) || (pagination.offset as number) < 0) throw new Error('Faculty profiles could not be read.')
  const seen = new Set<number>()
  const profiles = data.facultyProfiles.map(value => {
    const profile = object(value)
    const id = profile.id
    if (!Number.isInteger(id) || (id as number) <= 0 || seen.has(id as number) || !text(profile.fullName, 250) || !profile.fullName.trim()
      || !text(profile.campus, 200) || !text(profile.college, 200) || !text(profile.rank, 150) || !timestamp(profile.updatedAt)) {
      throw new Error('Faculty profiles could not be read.')
    }
    seen.add(id as number)
    const sourceEducation = object(profile.education)
    const education = {} as FacultyProfile['education']
    for (const level of ['bachelor', 'master', 'doctoral'] as const) {
      const source = object(sourceEducation[level])
      if (!text(source.degree, 500) || !text(source.institution, 300) || !text(source.specialization, 500) || !text(source.status, 30)) {
        throw new Error('Faculty education records could not be read.')
      }
      education[level] = { degree: source.degree, institution: source.institution, specialization: source.specialization, status: source.status }
    }
    return { id: id as number, fullName: profile.fullName, campus: profile.campus, college: profile.college, rank: profile.rank, education, updatedAt: profile.updatedAt }
  })
  if (profiles.length > (pagination.limit as number) || (pagination.offset as number) + profiles.length > (pagination.total as number)) {
    throw new Error('Faculty profile paging records could not be read.')
  }
  return {
    schemaVersion: 1, sourceId: 'sinq', mode: data.mode as FacultyProfilePage['mode'], status: data.status as FacultyProfilePage['status'], observedAt: data.observedAt,
    facultyProfiles: profiles, pagination: { total: pagination.total as number, limit: pagination.limit as number, offset: pagination.offset as number },
  }
}

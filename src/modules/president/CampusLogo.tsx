import type { CSSProperties } from 'react'
import type { Campus } from './data'

export default function CampusLogo({ campus, large = false }: { campus: Campus; large?: boolean }) {
  return <span className={'pd-campus-logo' + (large ? ' is-large' : '')}
    style={{ '--campus-color': campus.color, '--campus-tint': campus.tint } as CSSProperties}
    role="img" aria-label={`${campus.name} campus symbol`}>
    <span className="pd-logo-stars" aria-hidden="true">✦</span>
    <span className="pd-logo-letters" aria-hidden="true">{campus.mark}</span>
    <span className="pd-logo-school" aria-hidden="true">SKSU</span>
  </span>
}

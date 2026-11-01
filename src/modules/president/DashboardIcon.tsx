export type DashboardIconName = 'overview' | 'campus' | 'connections' | 'students' | 'faculty' | 'programs' | 'budget' | 'arrow' | 'chevron' | 'trend' | 'search' | 'close' | 'menu' | 'logout' | 'shield' | 'calendar' | 'info' | 'check' | 'research' | 'extension' | 'production' | 'buildings' | 'assets' | 'refresh' | 'travel' | 'vehicle' | 'employee' | 'document'

export default function DashboardIcon({ name, size = 20 }: { name: DashboardIconName; size?: number }) {
  const paths = {
    travel: <><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13" /></>,
    vehicle: <><rect x="5" y="3" width="14" height="16" rx="3" /><path d="M5 10h14M12 3v7M7 19v2m10-2v2M8 15h1m6 0h1" /></>,
    employee: <><circle cx="8" cy="7" r="3" /><path d="M2 21v-2a6 6 0 0 1 9-5m10 0c0 3-4 7-4 7s-4-4-4-7a4 4 0 0 1 8 0Z" /><circle cx="17" cy="14" r="1" /></>,
    document: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8m-8 4h6" /></>,
    refresh: <><path d="M20 8a8 8 0 0 0-14-3L3 8m0 0V3m0 5h5M4 16a8 8 0 0 0 14 3l3-3m0 0v5m0-5h-5" /></>,
    research: <><path d="M9 3h6m-5 0v6l-6 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-9V3M7 14h10" /><circle cx="11" cy="17" r=".5" /></>,
    extension: <><circle cx="12" cy="5" r="2" /><circle cx="5" cy="17" r="2" /><circle cx="19" cy="17" r="2" /><path d="M12 7v5m0 0-6 3m6-3 6 3M4 7l2 3m14-3-2 3M10 20h4" /></>,
    production: <><path d="M5 21V10l5 3V9l5 3V6h4v15H5ZM3 21h18M8 17h1m3 0h1m3 0h1M16 3h2" /></>,
    buildings: <><path d="M5 21V4h10v17M15 10h5v11M3 21h19M8 7h1m2 0h1M8 11h1m2 0h1M8 15h1m2 0h1M9 21v-3h3v3m5-7h1m-1 3h1" /></>,
    assets: <><path d="m12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5" /></>,
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    campus: <><path d="m3 9 9-6 9 6M4 10h16M5 10v10m5-10v10m4-10v10m5-10v10M3 21h18" /></>,
    connections: <><rect x="3" y="3" width="6" height="6" rx="1.5" /><rect x="15" y="15" width="6" height="6" rx="1.5" /><path d="M6 9v6a3 3 0 0 0 3 3h6M9 6h6a3 3 0 0 1 3 3v6" /></>,
    students: <><path d="m2 9 10-5 10 5-10 5L2 9Zm4 2v6c4 3 8 3 12 0v-6M22 9v7" /></>,
    faculty: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></>,
    programs: <><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15M6 8h3M6 12h3m6-4h3m-3 4h3" /></>,
    budget: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 9h18m-6 4h6m-5 2h1M6 5V3h12v2" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
    trend: <><path d="m3 17 6-6 4 4 8-10m-6 0h6v6" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    logout: <><path d="M9 4H5v16h4m3-8h9m-4-4 4 4-4 4" /></>,
    shield: <><path d="m12 3 8 3v5c0 5-8 10-8 10S4 16 4 11V6l8-3Z" /><path d="m8.5 11.5 2.5 2.5 4.5-5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

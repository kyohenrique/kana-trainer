import type { SVGProps } from 'react'

type IconName = 'check' | 'arrow' | 'globe' | 'chevron' | 'minus'
const paths: Record<IconName, string> = {
  check: 'm5 12 4 4L19 6',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  globe:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c4 4.5 4 13.5 0 18-4-4.5-4-13.5 0-18Z',
  chevron: 'm6 9 6 6 6-6',
  minus: 'M5 12h14',
}

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  )
}

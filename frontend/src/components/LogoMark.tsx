interface LogoMarkProps {
  size?: number;
  className?: string;
}

// Abstract mark: a woven basket silhouette (a callback to East African market
// trade — goods carried and sold) rendered as simple interlocking bands,
// with a small gold accent mark standing in for a price tag. Built as a
// scalable inline SVG rather than a raster logo so it stays crisp at any
// size, from favicon to hero.
export function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Daniel's Store logo"
    >
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--color-teal)" />
      <path
        d="M8 13.5C8 12.6716 8.67157 12 9.5 12H22.5C23.3284 12 24 12.6716 24 13.5V13.5C24 13.7761 23.8722 14.0367 23.6538 14.2065L22.3462 15.2213C22.1278 15.3911 22 15.6517 22 15.9278V21C22 22.1046 21.1046 23 20 23H12C10.8954 23 10 22.1046 10 21V15.9278C10 15.6517 9.87225 15.3911 9.65385 15.2213L8.34615 14.2065C8.12775 14.0367 8 13.7761 8 13.5V13.5Z"
        fill="var(--color-paper)"
        fillOpacity="0.95"
      />
      <path
        d="M11.5 12C11.5 9.79086 13.2909 8 15.5 8H16.5C18.7091 8 20.5 9.79086 20.5 12"
        stroke="var(--color-paper)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="21.5" cy="18.5" r="2" fill="var(--color-gold)" />
    </svg>
  );
}

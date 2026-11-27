export function ThemeToggle() {
  return (
    <button
      id='theme-toggle'
      type='button'
      class='theme-toggle no-print'
      aria-label='Change theme'
      hidden
    >
      <svg
        class='theme-icon theme-icon-light'
        viewBox='0 0 24 24'
        aria-hidden='true'
        focusable='false'
      >
        <circle
          cx='12'
          cy='12'
          r='4'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
        />
        <path
          d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41'
          stroke='currentColor'
          stroke-width='2'
          stroke-linecap='round'
        />
      </svg>
      <svg
        class='theme-icon theme-icon-dark'
        viewBox='0 0 24 24'
        aria-hidden='true'
        focusable='false'
      >
        <path
          d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
          stroke-linejoin='round'
        />
      </svg>
      <svg
        class='theme-icon theme-icon-system'
        viewBox='0 0 24 24'
        aria-hidden='true'
        focusable='false'
      >
        <circle
          cx='12'
          cy='12'
          r='9'
          fill='none'
          stroke='currentColor'
          stroke-width='2'
        />
        <path d='M12 3a9 9 0 0 0 0 18z' fill='currentColor' />
      </svg>
    </button>
  )
}

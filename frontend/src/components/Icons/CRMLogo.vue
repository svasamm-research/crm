<template>
  <svg
    width="300"
    height="300"
    viewBox="0 0 300 300"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Svasamm CRM"
  >
    <!--
      Svasamm CRM app-icon mark. ViewBox intentionally preserved at 300x300 so
      existing callers (AppSidebar, BrandLogo, PreferencesSettings, AboutModal)
      do not need layout adjustments.
    -->
    <defs>
      <linearGradient id="crm-logo-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#2563eb" />
        <stop offset="100%" stop-color="#1e40af" />
      </linearGradient>
    </defs>
    <rect width="300" height="300" rx="56" fill="url(#crm-logo-grad)" />
    <g fill="#ffffff">
      <path d="M56 75 L244 75 L216 122 L84 122 Z" />
      <path d="M94 131 L206 131 L178 188 L122 188 Z" />
      <path d="M131 197 L169 197 L159 244 L141 244 Z" />
    </g>
  </svg>
</template>

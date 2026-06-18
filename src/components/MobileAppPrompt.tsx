const BADGE_STYLE = {
  background: 'linear-gradient(180deg, #2a3540 0%, #1a222b 100%)',
  border: '1px solid rgba(235, 243, 254, 0.12)',
}

export default function MobileAppPrompt() {
  return (
    <div className="page-gradient flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <img src="/filr-logo.svg" alt="Filr" className="mx-auto h-16 w-16" />
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Use the Filr app on your phone</h1>
        <p className="mt-3 text-sm leading-relaxed text-filr-muted">
          Filr Web is built for computers and tablets. Get the app on your phone.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <div
            className="inline-flex w-[220px] cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 opacity-80"
            style={BADGE_STYLE}
            aria-label="Download on App Store"
          >
            <svg className="h-8 w-8 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[10px] uppercase leading-none tracking-wide text-filr-muted">Download on</p>
              <p className="mt-0.5 whitespace-nowrap text-base font-semibold leading-none">App Store</p>
            </div>
            <span className="shrink-0 rounded-full bg-filr-accent/20 px-2 py-0.5 text-[10px] font-medium text-filr-accent">
              Soon
            </span>
          </div>

          <div
            className="inline-flex w-[220px] cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 opacity-80"
            style={BADGE_STYLE}
            aria-label="Download on Google Play"
          >
            <svg className="h-8 w-8 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
            </svg>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[10px] uppercase leading-none tracking-wide text-filr-muted">Download on</p>
              <p className="mt-0.5 whitespace-nowrap text-base font-semibold leading-none">Google Play</p>
            </div>
            <span className="shrink-0 rounded-full bg-filr-accent/20 px-2 py-0.5 text-[10px] font-medium text-filr-accent">
              Soon
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

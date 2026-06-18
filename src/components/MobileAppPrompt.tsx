const APP_HOME_URL = 'https://www.myfilr.app'

export default function MobileAppPrompt() {
  return (
    <div className="page-gradient flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <img src="/filr-logo.svg" alt="Filr" className="mx-auto h-16 w-16" />
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Use the Filr app on your phone</h1>
        <p className="mt-3 text-sm leading-relaxed text-filr-muted">
          Filr Web is built for computers and tablets. Get the app on your phone.
        </p>
        <a
          href={APP_HOME_URL}
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-filr-accent text-[15px] font-semibold text-filr-accent-fg transition hover:bg-filr-accent/90"
        >
          Get the Filr app
        </a>
      </div>
    </div>
  )
}

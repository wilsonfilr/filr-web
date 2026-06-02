export type DeviceKind = 'phone' | 'tablet' | 'desktop'

/** Distinguish phones from tablets/desktops so we can block only small-phone UX. */
export function detectDeviceKind(): DeviceKind {
  if (typeof window === 'undefined') return 'desktop'

  const ua = navigator.userAgent

  // iPadOS 13+ often reports as Mac with touch.
  const isIpad =
    /\biPad\b/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua)
  const isOtherTablet = /Tablet|PlayBook|Silk/i.test(ua)

  if (isIpad || isAndroidTablet || isOtherTablet) {
    return 'tablet'
  }

  const isPhoneUa =
    /iPhone|iPod|Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(ua) ||
    (/Android/i.test(ua) && /Mobile/i.test(ua))

  const minScreen = Math.min(window.screen.width, window.screen.height)
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const isSmallTouchDevice = minScreen <= 600 && coarsePointer

  if (isPhoneUa || isSmallTouchDevice) {
    return 'phone'
  }

  return 'desktop'
}

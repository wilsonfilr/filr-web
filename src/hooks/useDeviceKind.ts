import { useEffect, useState } from 'react'
import { detectDeviceKind, type DeviceKind } from '../lib/deviceKind'

export function useDeviceKind(): DeviceKind | null {
  const [kind, setKind] = useState<DeviceKind | null>(null)

  useEffect(() => {
    const update = () => setKind(detectDeviceKind())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return kind
}

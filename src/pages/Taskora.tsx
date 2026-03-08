import { useMemo } from 'react'
import { getTaskoraEmbedUrl } from '@/lib/shellSettings'
import { useAuth } from '@/context/AuthContext'

export default function Taskora() {
  const { user } = useAuth()
  const envUrl = import.meta.env.VITE_TASKORA_EMBED_URL
  const embeddedUrl = useMemo(() => {
    if (envUrl && envUrl.trim()) return envUrl
    return getTaskoraEmbedUrl()
  }, [envUrl])

  const embeddedIframeUrl = useMemo(() => {
    if (embeddedUrl.includes('embed=1')) return embeddedUrl
    return `${embeddedUrl}${embeddedUrl.includes('?') ? '&' : '?'}embed=1`
  }, [embeddedUrl])

  const iframeUrlWithVersion = useMemo(() => {
    const parts: string[] = ['v=embedv3']
    if (user?.id) {
      parts.push(`orbitum_uid=${encodeURIComponent(String(user.id))}`)
    }
    return `${embeddedIframeUrl}${embeddedIframeUrl.includes('?') ? '&' : '?'}${parts.join('&')}`
  }, [embeddedIframeUrl, user?.id])

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <iframe
        src={iframeUrlWithVersion}
        title="Taskora Embedded"
        style={{
          width: '100%',
          minHeight: '86vh',
          border: 0,
          background: '#0b1220',
        }}
      />
    </div>
  )
}

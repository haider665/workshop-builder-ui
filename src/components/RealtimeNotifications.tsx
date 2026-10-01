import { useEffect } from 'react'
import { io } from 'socket.io-client'
import type { CWNotification } from '../types/cw'
import { workshopApi } from '../services/workshopApi'
import { useCompanyStore } from '../store/companyStore'
import { useSessionStore } from '../store/sessionStore'
import { useCwStore } from '../store/cwStore'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, '')
const socketOrigin = import.meta.env.VITE_SOCKET_URL || new URL(apiBaseUrl, window.location.origin).origin


function workshopRoute(notification: CWNotification) {
  const id = notification.referenceId
  const type = (notification as CWNotification & { referenceType?: string }).referenceType
  if (!id || !type) return notification.actionUrl
  const routes: Record<string, string> = {
    'CW Appointment': `/sa/appointments/${id}`, 'CW Job': `/jc/jobs/${id}`, 'CW Job Task': `/tasks/${id}`,
    'CW Test Drive': '/test-drives', 'CW Part Request': '/parts/part-requests', 'CW Requisition': '/parts/requisitions',
    'CW Purchase Order': '/parts/purchase-orders', 'CW Part Return': '/parts/returns', 'CW Estimate Line': '/parts/estimates',
  }
  const route = routes[type] || notification.actionUrl
  if (route?.startsWith('/accounting') || route?.startsWith('/resources')) return `${new URL(apiBaseUrl, window.location.origin).origin}${route}`
  return route
}

function mergeNotification(notification: CWNotification, event = 'created') {
  useCwStore.setState((state) => ({
    notifications: event === 'deleted'
      ? state.notifications.filter((row) => row.id !== notification.id)
      : [notification, ...state.notifications.filter((row) => row.id !== notification.id)],
  }))
}

export function RealtimeNotifications() {
  const status = useSessionStore((state) => state.status)
  const siteName = useSessionStore((state) => state.user?.siteName || import.meta.env.VITE_SITE_NAME || '')
  const selectedCompanyId = useCompanyStore((state) => state.selectedCompanyId)
  const hydrateFromBackend = useCwStore((state) => state.hydrateFromBackend)
  useEffect(() => {
    if (status !== 'authenticated') return
    let active = true
    const refresh = async () => {
      try {
        const result = await workshopApi.listNotifications({ page: 1, pageSize: 100 })
        if (active) useCwStore.setState({ notifications: result.data as CWNotification[] })
      } catch { /* API errors are already shown globally. */ }
    }
    const beat = () => { void workshopApi.userHeartbeat().catch(() => undefined) }
    // Frappe's reverse proxy exposes Socket.IO at the origin's `/socket.io`
    // endpoint, while the authenticated site is a Socket.IO namespace. The
    // namespace belongs in the client URL (the HTTP path remains `/socket.io`);
    // using the public hostname as the namespace silently misses the user's
    // private room when those two names differ.
    const namespace = siteName ? `/${siteName.replace(/^\/+|\/+$/g, '')}` : undefined
    const socket = io(namespace ? `${socketOrigin}${namespace}` : socketOrigin, {
      path: import.meta.env.VITE_SOCKET_PATH || '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    })
    socket.on('connect_error', (error) => {
      // The polling refresh below is an intentional resilience path. Keep the
      // error visible to diagnostics without interrupting the user's workflow.
      console.warn('[workshop] realtime notifications unavailable; using polling fallback', error.message)
    })
    const receive = (payload: CWNotification & { event?: string; description?: string; companyId?: string }) => {
      if (payload.companyId && selectedCompanyId && payload.companyId !== selectedCompanyId) return
      const notification = { ...payload, actionUrl: workshopRoute(payload), title: payload.title || payload.description || 'Notification', message: payload.message || payload.description || payload.title || '' }
      mergeNotification(notification, payload.event)
      window.dispatchEvent(new CustomEvent('cw:notification-update', { detail: notification }))
      if (payload.event !== 'updated' && payload.event !== 'deleted') window.dispatchEvent(new CustomEvent('cw:notification-toast', { detail: { message: notification.title === notification.message ? notification.title : `${notification.title}: ${notification.message}`, actionUrl: notification.actionUrl } }))
    }
    const refreshData = (event: Event) => {
      const detail = (event as CustomEvent<{ referenceType?: string }>).detail
      if (!detail?.referenceType || !['CW Concern', 'CW Service', 'CW Part', 'CW Customer', 'CW Vehicle', 'CW Appointment', 'CW Master Data Request'].includes(detail.referenceType)) return
      void hydrateFromBackend()
    }
    socket.on('cw_notification', receive)
    window.addEventListener('cw:notification-update', refreshData)
    socket.on('connect', refresh)
    socket.io.on('reconnect', refresh)
    void refresh()
    beat()
    // Realtime is preferred, but a short bounded fallback keeps assignment
    // notifications usable during deploys or transient websocket failures.
    const fallback = window.setInterval(() => void refresh(), 10000)
    const presence = window.setInterval(beat, 30000)
    const visible = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', visible)
    return () => { active = false; window.clearInterval(fallback); window.clearInterval(presence); document.removeEventListener('visibilitychange', visible); window.removeEventListener('cw:notification-update', refreshData); socket.off('cw_notification', receive); socket.disconnect() }
  }, [hydrateFromBackend, selectedCompanyId, siteName, status])
  return null
}

import { useEffect } from 'react'
import { io } from 'socket.io-client'
import type { CWNotification } from '../types/cw'
import { workshopApi } from '../services/workshopApi'
import { useCompanyStore } from '../store/companyStore'
import { useSessionStore } from '../store/sessionStore'
import { useCwStore } from '../store/cwStore'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, '')
const siteName = import.meta.env.VITE_SITE_NAME || new URL(apiBaseUrl, window.location.origin).hostname
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
  const selectedCompanyId = useCompanyStore((state) => state.selectedCompanyId)
  useEffect(() => {
    if (status !== 'authenticated') return
    let active = true
    const refresh = async () => {
      try {
        const result = await workshopApi.listNotifications({ page: 1, pageSize: 100 })
        if (active) useCwStore.setState({ notifications: result.data as CWNotification[] })
      } catch { /* API errors are already shown globally. */ }
    }
    const socket = io(`${socketOrigin}/${siteName}`, { withCredentials: true, transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity })
    const receive = (payload: CWNotification & { event?: string; description?: string; companyId?: string }) => {
      if (payload.companyId && selectedCompanyId && payload.companyId !== selectedCompanyId) return
      const notification = { ...payload, actionUrl: workshopRoute(payload), title: payload.title || payload.description || 'Notification', message: payload.message || payload.description || payload.title || '' }
      mergeNotification(notification, payload.event)
      window.dispatchEvent(new CustomEvent('cw:notification-update', { detail: notification }))
      if (payload.event !== 'updated' && payload.event !== 'deleted') window.dispatchEvent(new CustomEvent('cw:notification-toast', { detail: { message: notification.title === notification.message ? notification.title : `${notification.title}: ${notification.message}`, actionUrl: notification.actionUrl } }))
    }
    socket.on('cw_notification', receive)
    socket.on('connect', refresh)
    socket.io.on('reconnect', refresh)
    void refresh()
    const fallback = window.setInterval(() => void refresh(), 60000)
    const visible = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', visible)
    return () => { active = false; window.clearInterval(fallback); document.removeEventListener('visibilitychange', visible); socket.off('cw_notification', receive); socket.disconnect() }
  }, [selectedCompanyId, status])
  return null
}

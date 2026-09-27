import { useEffect } from 'react'
import { useCwStore } from '../store/cwStore'

/**
 * Starts the shared backend hydration once. Pages consume the same store;
 * they must not each fan out their own copy of the initial dataset.
 */
export function useBackendData() {
  const hydrationStatus = useCwStore((state) => state.hydrationStatus)
  const hydrateFromBackend = useCwStore((state) => state.hydrateFromBackend)

  useEffect(() => {
    if (hydrationStatus !== 'idle') return
    void hydrateFromBackend()
  }, [hydrateFromBackend, hydrationStatus])
}

/** @deprecated Use useBackendData instead */
export const useCREData = useBackendData

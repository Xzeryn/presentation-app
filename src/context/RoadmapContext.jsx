import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const ROADMAP_STORAGE_KEY = 'presentation-roadmap-config'

const DEFAULT_ROADMAP_CONFIG = {
  selectedItemIds: [],
  excludedLabels: [],
  excludedKeyInitiatives: [],
  excludedReleaseTypes: [],
}

const RoadmapContext = createContext(null)

export function RoadmapProvider({ children }) {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem(ROADMAP_STORAGE_KEY)
    if (saved) {
      try {
        return { ...DEFAULT_ROADMAP_CONFIG, ...JSON.parse(saved) }
      } catch {
        return DEFAULT_ROADMAP_CONFIG
      }
    }
    return DEFAULT_ROADMAP_CONFIG
  })

  const [configModalOpen, setConfigModalOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify(config))
  }, [config])

  const openConfigModal = useCallback(() => setConfigModalOpen(true), [])
  const closeConfigModal = useCallback(() => setConfigModalOpen(false), [])

  const setSelectedItemIds = useCallback((ids) => {
    setConfig((prev) => ({ ...prev, selectedItemIds: ids }))
  }, [])

  const toggleItemSelection = useCallback((id) => {
    setConfig((prev) => {
      const ids = prev.selectedItemIds.includes(id)
        ? prev.selectedItemIds.filter((x) => x !== id)
        : [...prev.selectedItemIds, id]
      return { ...prev, selectedItemIds: ids }
    })
  }, [])

  const setExcludedLabels = useCallback((labels) => {
    setConfig((prev) => ({ ...prev, excludedLabels: labels }))
  }, [])

  const setExcludedKeyInitiatives = useCallback((initiatives) => {
    setConfig((prev) => ({ ...prev, excludedKeyInitiatives: initiatives }))
  }, [])

  const setExcludedReleaseTypes = useCallback((types) => {
    setConfig((prev) => ({ ...prev, excludedReleaseTypes: types }))
  }, [])

  const resetRoadmapConfig = useCallback(() => {
    setConfig(DEFAULT_ROADMAP_CONFIG)
  }, [])

  const contextValue = useMemo(
    () => ({
      selectedItemIds: config.selectedItemIds,
      excludedLabels: config.excludedLabels,
      excludedKeyInitiatives: config.excludedKeyInitiatives,
      excludedReleaseTypes: config.excludedReleaseTypes,
      configModalOpen,
      openConfigModal,
      closeConfigModal,
      setSelectedItemIds,
      toggleItemSelection,
      setExcludedLabels,
      setExcludedKeyInitiatives,
      setExcludedReleaseTypes,
      resetRoadmapConfig,
    }),
    [
      config,
      configModalOpen,
      openConfigModal,
      closeConfigModal,
      setSelectedItemIds,
      toggleItemSelection,
      setExcludedLabels,
      setExcludedKeyInitiatives,
      setExcludedReleaseTypes,
      resetRoadmapConfig,
    ]
  )

  return (
    <RoadmapContext.Provider value={contextValue}>
      {children}
    </RoadmapContext.Provider>
  )
}

export function useRoadmapConfig() {
  const ctx = useContext(RoadmapContext)
  if (!ctx) {
    throw new Error('useRoadmapConfig must be used within RoadmapProvider')
  }
  return ctx
}

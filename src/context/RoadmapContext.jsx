import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const ROADMAP_STORAGE_KEY = 'presentation-roadmap-config'

const DEFAULT_ROADMAP_CONFIG = {
  selectedItemIds: [],
  filterLabels: [],
  filterKeyInitiatives: [],
  filterReleaseTypes: [],
  filterStates: [],
  filterStatus: [],
}

const RoadmapContext = createContext(null)

export function RoadmapProvider({ children }) {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem(ROADMAP_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          ...DEFAULT_ROADMAP_CONFIG,
          selectedItemIds: parsed.selectedItemIds ?? DEFAULT_ROADMAP_CONFIG.selectedItemIds,
          filterLabels: parsed.filterLabels ?? [],
          filterKeyInitiatives: parsed.filterKeyInitiatives ?? [],
          filterReleaseTypes: parsed.filterReleaseTypes ?? [],
          filterStates: parsed.filterStates ?? [],
          filterStatus: parsed.filterStatus ?? [],
        }
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

  const setFilterLabels = useCallback((labels) => {
    setConfig((prev) => ({ ...prev, filterLabels: labels }))
  }, [])

  const setFilterKeyInitiatives = useCallback((initiatives) => {
    setConfig((prev) => ({ ...prev, filterKeyInitiatives: initiatives }))
  }, [])

  const setFilterReleaseTypes = useCallback((types) => {
    setConfig((prev) => ({ ...prev, filterReleaseTypes: types }))
  }, [])

  const setFilterStates = useCallback((states) => {
    setConfig((prev) => ({ ...prev, filterStates: states }))
  }, [])

  const setFilterStatus = useCallback((status) => {
    setConfig((prev) => ({ ...prev, filterStatus: status }))
  }, [])

  const resetRoadmapConfig = useCallback(() => {
    setConfig(DEFAULT_ROADMAP_CONFIG)
  }, [])

  const contextValue = useMemo(
    () => ({
      selectedItemIds: config.selectedItemIds,
      filterLabels: config.filterLabels ?? [],
      filterKeyInitiatives: config.filterKeyInitiatives ?? [],
      filterReleaseTypes: config.filterReleaseTypes ?? [],
      filterStates: config.filterStates ?? [],
      filterStatus: config.filterStatus ?? [],
      configModalOpen,
      openConfigModal,
      closeConfigModal,
      setSelectedItemIds,
      toggleItemSelection,
      setFilterLabels,
      setFilterKeyInitiatives,
      setFilterReleaseTypes,
      setFilterStates,
      setFilterStatus,
      resetRoadmapConfig,
    }),
    [
      config,
      configModalOpen,
      openConfigModal,
      closeConfigModal,
      setSelectedItemIds,
      toggleItemSelection,
      setFilterLabels,
      setFilterKeyInitiatives,
      setFilterReleaseTypes,
      setFilterStates,
      setFilterStatus,
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

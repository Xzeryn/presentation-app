import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faRocket, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../context/ThemeContext'
import { useRoadmapConfig } from '../context/RoadmapContext'
import RoadmapDetailModal from '../components/RoadmapDetailModal'

const PRODUCT_AREA_COLORS = {
  Search: '#0B64DD',
  Observability: '#48EFCF',
  Security: '#F04E98',
  Elasticsearch: '#0052CC',
  Kibana: '#FEC514',
  Fleet: '#FF957D',
  Other: '#6B7280',
}

// Timeline bands: left (past) to right (future)
const BAND_ORDER = [
  'Aug–Oct 2025  | Shipped',
  'Nov 2025–Jan 2026  | Shipped',
  'Recently Shipped',
  'In Progress',
  'Near-Term',
  'Mid-Term',
]

const BAND_LABELS = {
  'Aug–Oct 2025  | Shipped': 'Aug–Oct 2025',
  'Nov 2025–Jan 2026  | Shipped': 'Nov 2025–Jan 2026',
  'Recently Shipped': 'Recently Shipped',
  'In Progress': 'Now',
  'Near-Term': 'Coming Soon',
  'Mid-Term': 'Future',
}

function formatProductAreaDisplay(area) {
  if (!area || area === 'Other') return 'Other'
  if (area.startsWith('product-area:')) {
    const value = area.slice('product-area:'.length)
    const capitalized = value
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
    return `Product Area: ${capitalized}`
  }
  return area
}

function getDisplayPreview(item) {
  if (item.summary?.value) return item.summary.value
  if (item.summary?.for) return item.summary.for
  if (!item.body) return ''
  return item.body
    .replace(/\*\*[^*]+\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_`]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
}

function RoadmapScene() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { selectedItemIds, openConfigModal } = useRoadmapConfig()

  const [roadmapData, setRoadmapData] = useState({ items: [] })
  const [activeProductArea, setActiveProductArea] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [currentColumnIndex, setCurrentColumnIndex] = useState(0)

  useEffect(() => {
    fetch('/config/roadmap.json')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then(setRoadmapData)
      .catch(() => setRoadmapData({ items: [] }))
  }, [])

  const selectedItems = useMemo(() => {
    const byId = new Map(roadmapData.items.map((i) => [i.id, i]))
    return selectedItemIds.map((id) => byId.get(id)).filter(Boolean)
  }, [roadmapData.items, selectedItemIds])

  const displayedItems = useMemo(() => {
    if (!activeProductArea) return selectedItems
    return selectedItems.filter((i) => (i.productArea || 'Other') === activeProductArea)
  }, [selectedItems, activeProductArea])

  const productAreasWithItems = useMemo(() => {
    const areas = new Set()
    selectedItems.forEach((item) => {
      const area = item.productArea || 'Other'
      areas.add(area)
    })
    return [...areas].sort()
  }, [selectedItems])

  // Group items by band (status) - vertical stacking within each band
  const timelineBands = useMemo(() => {
    const byBand = {}
    displayedItems.forEach((item) => {
      const band = item.status && BAND_ORDER.includes(item.status) ? item.status : null
      if (band) {
        if (!byBand[band]) byBand[band] = []
        byBand[band].push(item)
      }
    })
    return {
      byBand,
      bands: BAND_ORDER.filter((b) => displayedItems.some((i) => i.status === b)),
    }
  }, [displayedItems])

  const isEmpty = selectedItems.length === 0

  const scrollRef = useRef(null)
  const columnRefs = useRef([])

  const hasOverflow = !isEmpty && timelineBands.bands.length > 1

  const scrollToColumn = (index) => {
    const i = Math.max(0, Math.min(index, timelineBands.bands.length - 1))
    setCurrentColumnIndex(i)
    const el = columnRefs.current[i]
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ left: el.offsetLeft, behavior: 'smooth' })
    }
  }

  const handlePrev = () => scrollToColumn(currentColumnIndex - 1)
  const handleNext = () => scrollToColumn(currentColumnIndex + 1)

  const canGoPrev = hasOverflow && currentColumnIndex > 0
  const canGoNext = hasOverflow && currentColumnIndex < timelineBands.bands.length - 1

  // Update current column when user scrolls (e.g. swipe)
  useEffect(() => {
    const el = scrollRef.current
    if (!el || isEmpty) return

    const onScroll = () => {
      const scrollLeft = el.scrollLeft
      const containerWidth = el.clientWidth
      let best = 0
      let bestDist = Infinity
      columnRefs.current.forEach((col, i) => {
        if (!col) return
        const dist = Math.abs(col.offsetLeft - scrollLeft)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      })
      setCurrentColumnIndex(best)
    }

    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [isEmpty, timelineBands.bands.length])

  // Reset column index when bands change
  useEffect(() => {
    setCurrentColumnIndex(0)
  }, [timelineBands.bands.length])

  // Keyboard: arrow keys scroll timeline when it has overflow (otherwise App handles scene nav)
  useEffect(() => {
    if (!hasOverflow) return

    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && canGoPrev) {
        e.preventDefault()
        e.stopPropagation()
        handlePrev()
      } else if (e.key === 'ArrowRight' && canGoNext) {
        e.preventDefault()
        e.stopPropagation()
        handleNext()
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [hasOverflow, canGoPrev, canGoNext, handlePrev, handleNext])

  return (
    <div className="scene roadmap-scene relative">
      {/* Gear */}
      <button
        onClick={openConfigModal}
        className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isDark
            ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
            : 'bg-elastic-dev-blue/10 hover:bg-elastic-dev-blue/20 text-elastic-dev-blue/70 hover:text-elastic-dev-blue'
        }`}
        title="Configure roadmap"
      >
        <FontAwesomeIcon icon={faGear} />
      </button>

      <div className="max-w-7xl mx-auto w-full min-w-0">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className={`text-eyebrow text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
            Investment in Innovation
          </span>
          <h2 className={`text-headline text-4xl md:text-5xl font-extrabold mt-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Your <span className="gradient-text">Roadmap</span> Ahead
          </h2>
          <p className={`text-paragraph text-lg mt-2 max-w-2xl mx-auto ${isDark ? 'text-elastic-light-grey' : 'text-elastic-ink'}`}>
            Capabilities in development—built to deliver value for you
          </p>
        </motion.div>

        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center py-16 px-8 rounded-2xl border-2 border-dashed ${
              isDark ? 'border-white/20 bg-white/[0.02]' : 'border-elastic-dev-blue/20 bg-elastic-dev-blue/[0.02]'
            }`}
          >
            <FontAwesomeIcon
              icon={faRocket}
              className={`text-4xl mb-4 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}
            />
            <p className={`text-lg font-medium ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
              No roadmap items selected
            </p>
            <p className={`text-sm mt-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Click the gear icon to configure and select items from the roadmap
            </p>
            <button
              onClick={openConfigModal}
              className={`mt-6 px-6 py-3 rounded-full font-medium transition-all ${
                isDark
                  ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                  : 'bg-elastic-blue/20 hover:bg-elastic-blue/30 text-elastic-blue'
              }`}
            >
              Configure Roadmap
            </button>
          </motion.div>
        ) : (
          <>
            {/* Filters: Product area */}
            {productAreasWithItems.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap justify-center gap-2 mb-6"
              >
                <button
                  onClick={() => setActiveProductArea(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    !activeProductArea
                      ? isDark
                        ? 'bg-elastic-teal/30 text-elastic-teal'
                        : 'bg-elastic-blue/30 text-elastic-blue'
                      : isDark
                        ? 'bg-white/10 text-white/60 hover:bg-white/20'
                        : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/60 hover:bg-elastic-dev-blue/20'
                  }`}
                >
                  All
                </button>
                {productAreasWithItems.map((area) => (
                  <button
                    key={area}
                    onClick={() => setActiveProductArea(area)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeProductArea === area
                        ? isDark
                          ? 'bg-elastic-teal/30 text-elastic-teal'
                          : 'bg-elastic-blue/30 text-elastic-blue'
                        : isDark
                          ? 'bg-white/10 text-white/60 hover:bg-white/20'
                          : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/60 hover:bg-elastic-dev-blue/20'
                    }`}
                    style={
                      activeProductArea === area
                        ? { borderColor: PRODUCT_AREA_COLORS[area] || PRODUCT_AREA_COLORS.Other }
                        : {}
                    }
                  >
                    {formatProductAreaDisplay(area)}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Timeline - fixed full-height edge buttons, arrows centered, always visible */}
            <div className="roadmap-timeline-wrapper">
              {hasOverflow && (
                <>
                  <button
                    onClick={handlePrev}
                    disabled={!canGoPrev}
                    aria-label="Previous column"
                    className={`roadmap-timeline-edge roadmap-timeline-edge-left ${
                      !canGoPrev ? 'roadmap-timeline-edge-disabled' : ''
                    } ${isDark ? 'roadmap-timeline-edge-dark' : 'roadmap-timeline-edge-light'}`}
                  >
                    <span className="roadmap-timeline-edge-icon">
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </span>
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!canGoNext}
                    aria-label="Next column"
                    className={`roadmap-timeline-edge roadmap-timeline-edge-right ${
                      !canGoNext ? 'roadmap-timeline-edge-disabled' : ''
                    } ${isDark ? 'roadmap-timeline-edge-dark' : 'roadmap-timeline-edge-light'}`}
                  >
                    <span className="roadmap-timeline-edge-icon">
                      <FontAwesomeIcon icon={faChevronRight} />
                    </span>
                  </button>
                </>
              )}
              <div ref={scrollRef} className="roadmap-timeline-scroll-container">
                <div className="roadmap-timeline-track">
                  {timelineBands.bands.map((band, i) => {
                    const items = timelineBands.byBand[band] || []
                    const useMultiColumn = items.length > 6
                    return (
                      <div
                        key={band}
                        ref={(el) => { columnRefs.current[i] = el }}
                        className={`roadmap-timeline-column flex flex-col shrink-0 border-r last:border-r-0 ${
                          useMultiColumn ? 'w-[620px]' : 'w-[300px]'
                        } ${isDark ? 'border-white/30' : 'border-elastic-dev-blue/30'}`}
                      >
                      {/* Band header */}
                      <div
                        className={`p-3 border-b text-center text-sm font-medium shrink-0 ${
                          isDark ? 'border-white/30 text-white/70' : 'border-elastic-dev-blue/30 text-elastic-dev-blue/70'
                        }`}
                      >
                        {BAND_LABELS[band] || band}
                        <span className="opacity-70 ml-1">({items.length})</span>
                      </div>
                      {/* Items: multi-column grid when many, single column otherwise */}
                      <div
                        className={`p-2 gap-2 min-h-[120px] ${
                          useMultiColumn ? 'grid grid-cols-[300px_300px]' : 'flex flex-col'
                        } ${isDark ? 'bg-white/[0.02]' : 'bg-elastic-dev-blue/[0.02]'}`}
                      >
                        {items.map((item, index) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => setDetailItem(item)}
                            className={`relative w-[300px] p-3 rounded-lg border cursor-pointer transition-all text-left shrink-0 ${
                              isDark
                                ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                                : 'bg-white/90 border-elastic-dev-blue/10 hover:bg-white hover:border-elastic-dev-blue/20'
                            }`}
                          >
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                              style={{
                                backgroundColor: PRODUCT_AREA_COLORS[item.productArea] || PRODUCT_AREA_COLORS.Other,
                              }}
                            />
                            <div className="pl-2">
                              <h4 className={`font-semibold text-sm line-clamp-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                                {item.title}
                              </h4>
                              {(item.summary || item.body) && (
                                <p
                                  className={`text-xs mt-1 line-clamp-2 ${
                                    isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'
                                  }`}
                                >
                                  {getDisplayPreview(item)}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.releaseType && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/20 text-elastic-blue'
                                    }`}
                                  >
                                    {item.releaseType}
                                  </span>
                                )}
                                {item.state && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                      (item.state || '').toUpperCase() === 'CLOSED'
                                        ? isDark
                                          ? 'bg-white/10 text-white/50'
                                          : 'bg-slate-200/70 text-slate-500'
                                        : isDark
                                          ? 'bg-emerald-500/40 text-emerald-300'
                                          : 'bg-emerald-400/50 text-emerald-700'
                                    }`}
                                  >
                                    {item.state}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {detailItem && (
                <RoadmapDetailModal
                  key={detailItem.id}
                  item={detailItem}
                  onClose={() => setDetailItem(null)}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}

export default RoadmapScene

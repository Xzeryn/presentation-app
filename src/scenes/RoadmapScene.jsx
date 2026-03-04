import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faRocket } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../context/ThemeContext'
import { useRoadmapConfig } from '../context/RoadmapContext'

const PRODUCT_AREA_COLORS = {
  Search: '#0B64DD',
  Observability: '#48EFCF',
  Security: '#F04E98',
  Elasticsearch: '#0052CC',
  Kibana: '#FEC514',
  Fleet: '#FF957D',
  Other: '#6B7280',
}

function RoadmapScene() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { selectedItemIds, openConfigModal } = useRoadmapConfig()

  const [roadmapData, setRoadmapData] = useState({ items: [] })
  const [activeProductArea, setActiveProductArea] = useState(null)

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

  const productAreasWithItems = useMemo(() => {
    const areas = new Set()
    selectedItems.forEach((item) => item.productArea && areas.add(item.productArea))
    return [...areas].sort()
  }, [selectedItems])

  const itemsByArea = useMemo(() => {
    const byArea = {}
    selectedItems.forEach((item) => {
      const area = item.productArea || 'Other'
      if (!byArea[area]) byArea[area] = []
      byArea[area].push(item)
    })
    return byArea
  }, [selectedItems])

  const displayedItems = activeProductArea
    ? itemsByArea[activeProductArea] || []
    : selectedItems

  const isEmpty = selectedItems.length === 0

  return (
    <div className="scene relative">
      {/* Gear - on scene */}
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

      <div className="max-w-6xl mx-auto w-full">
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

        {/* Empty state */}
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
            {/* Product area tabs */}
            {productAreasWithItems.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap justify-center gap-2 mb-8"
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
                    {area}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Items grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative p-5 rounded-xl border ${
                    isDark
                      ? 'bg-white/[0.03] border-white/10'
                      : 'bg-white/80 border-elastic-dev-blue/10'
                  }`}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{
                      backgroundColor: PRODUCT_AREA_COLORS[item.productArea] || PRODUCT_AREA_COLORS.Other,
                    }}
                  />
                  <div className="pl-2">
                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                      {item.title}
                    </h3>
                    {item.body && (
                      <p
                        className={`text-sm mt-2 line-clamp-3 ${
                          isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'
                        }`}
                      >
                        {item.body.replace(/[#*_`]/g, '').slice(0, 150)}
                        {item.body.length > 150 ? '...' : ''}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.quarter && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            isDark ? 'bg-white/10 text-white/70' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/70'
                          }`}
                        >
                          {item.quarter}
                        </span>
                      )}
                      {item.releaseType && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/20 text-elastic-blue'
                          }`}
                        >
                          {item.releaseType}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default RoadmapScene

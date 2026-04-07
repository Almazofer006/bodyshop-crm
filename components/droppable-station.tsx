'use client'

import { useDroppable } from '@dnd-kit/core'
import type { Station } from '@/lib/types'

interface DroppableStationProps {
  station: Station
  children: React.ReactNode
  canDrop: boolean
}

export function DroppableStation({ station, children, canDrop }: DroppableStationProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: station.id,
    disabled: !canDrop,
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {station.name}
        </p>
      </div>
      <div
        ref={setNodeRef}
        className={`p-2 space-y-2 min-h-[80px] transition-colors ${
          isOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed rounded-b-lg' : ''
        }`}
      >
        {children}
      </div>
    </div>
  )
}

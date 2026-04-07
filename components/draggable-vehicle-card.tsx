'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { VehicleCard } from '@/components/vehicle-card'
import type { Vehicle, Profile, Station } from '@/lib/types'

interface DraggableVehicleCardProps {
  vehicle: Vehicle
  profile: Profile
  stations: Station[]
  onMoved: () => void
  isDragging: boolean
}

export function DraggableVehicleCard({ vehicle, profile, stations, onMoved, isDragging }: DraggableVehicleCardProps) {
  const canDrag = profile.role === 'admin' || profile.role === 'manager'

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: vehicle.id,
    disabled: !canDrag,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    cursor: canDrag ? 'grab' : 'default',
  }

  return (
    <div ref={setNodeRef} style={style} {...(canDrag ? { ...listeners, ...attributes } : {})}>
      <VehicleCard
        vehicle={vehicle}
        profile={profile}
        stations={stations}
        onMoved={onMoved}
      />
    </div>
  )
}

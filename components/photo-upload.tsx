'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'
import type { Profile, VehiclePhoto } from '@/lib/types'

interface PhotoUploadProps {
  vehicleId: string
  photos: VehiclePhoto[]
  profile: Profile
}

export function PhotoUpload({ vehicleId, photos: initialPhotos, profile }: PhotoUploadProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const canUpload = profile.role === 'admin' || profile.role === 'manager' || profile.role === 'master'

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)

    const supabase = createClient()
    const newPhotos: VehiclePhoto[] = []

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${vehicleId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(path, file)

      if (uploadError) {
        toast.error(`Ошибка загрузки ${file.name}`)
        continue
      }

      const { data: urlData } = supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(path)

      const { data: photo } = await supabase
        .from('vehicle_photos')
        .insert({
          vehicle_id: vehicleId,
          url: urlData.publicUrl,
          uploaded_by: profile.id,
        })
        .select()
        .single()

      if (photo) newPhotos.push(photo as VehiclePhoto)
    }

    setPhotos((prev) => [...newPhotos, ...prev])
    toast.success(`Загружено фото: ${newPhotos.length}`)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Фотографии ({photos.length})
          </CardTitle>
          {canUpload && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Загрузка...' : 'Добавить фото'}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Фотографии не добавлены</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.map((photo) => (
              <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
                <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity">
                  <Image
                    src={photo.url}
                    alt="Фото автомобиля"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

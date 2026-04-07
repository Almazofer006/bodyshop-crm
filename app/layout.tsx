import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Центр Кузовного ремонта Авалон',
  description: 'Система управления автомобилями в ремонте',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

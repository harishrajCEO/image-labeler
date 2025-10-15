import { Suspense } from 'react'
import LandingPage from '@/components/LandingPage'

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LandingPage />
    </Suspense>
  )
}
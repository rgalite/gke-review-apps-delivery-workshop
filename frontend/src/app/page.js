export const dynamic = 'force-dynamic'
import { getRestaurants } from '@/lib/strapi'

export default async function Home() {
  let restaurants = []

  try {
    restaurants = await getRestaurants()
  } catch (error) {
    console.error(error)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24"></main>
  )
}

export const dynamic = 'force-dynamic'
import { getRestaurants } from '@/lib/strapi'

export default async function Home() {
  const restaurants = await getRestaurants()
  console.log(restaurants)

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24"></main>
  )
}

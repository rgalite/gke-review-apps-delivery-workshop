export const dynamic = 'force-dynamic'
import { getRestaurants } from '@/lib/strapi'
import RestaurantsList from './components/restaurants-list/list'

export default async function Home() {
  let restaurants = []

  try {
    const restaurantsData = await getRestaurants({ sort: 'rankingPosition' })
    restaurants = restaurantsData.data || []
  } catch (error) {
    console.error(error)
    console.error(await error.response.text())
    restaurants = []
  }

  return (
    <main className="p-8">
      <div className="container mx-auto">
        <RestaurantsList restaurants={restaurants} />
      </div>
    </main>
  )
}

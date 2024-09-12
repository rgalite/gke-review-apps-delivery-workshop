import RestaurantListItem from './item'

export default function RestaurantsList({ restaurants }) {
  return (
    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
      {restaurants.map((restaurant) => (
        <RestaurantListItem
          key={restaurant.id}
          name={restaurant.attributes.name}
          address={restaurant.attributes.address}
          rankingPosition={restaurant.attributes.rankingPosition}
          rating={restaurant.attributes.rating}
          description={restaurant.attributes.description}
          numberOfReviews={restaurant.attributes.numberOfReviews}
          priceLevel={restaurant.attributes.priceLevel}
          priceRange={restaurant.attributes.priceRange}
        />
      ))}
    </div>
  )
}

'use strict'
const restaurants = require('./_seed/restaurants.json')

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    const now = new Date()
    await Promise.all(
      restaurants.map(async (restaurant) => {
        const entries = await strapi.entityService.findMany(
          'api::restaurant.restaurant',
          {
            filters: {
              name: restaurant.name,
            },
            fields: ['id'],
            limit: 1,
          }
        )

        if (entries.length === 0) {
          return strapi.entityService.create('api::restaurant.restaurant', {
            data: {
              name: restaurant.name,
              address: restaurant.address,
              rankingPosition: restaurant.rankingPosition,
              rating: restaurant.rating,
              numberOfReviews: restaurant.numberOfReviews,
              priceLevel: restaurant.priceLevel,
              priceRange: restaurant.priceRange,
              publishedAt: now,
            },
            fields: ['id'],
          })
        }

        const foundRestaurant = entries[0]

        return strapi.entityService.update(
          'api::restaurant.restaurant',
          foundRestaurant.id,
          {
            data: {
              name: restaurant.name,
              address: restaurant.address,
              rankingPosition: restaurant.rankingPosition,
              rating: restaurant.rating,
              numberOfReviews: restaurant.numberOfReviews,
              priceLevel: restaurant.priceLevel,
              priceRange: restaurant.priceRange,
              publishedAt: now,
            },
            fields: ['id'],
          }
        )
      })
    )
  },
}

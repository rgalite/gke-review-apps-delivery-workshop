'use strict'

/**
 * restaurant router
 */

const { createCoreRouter } = require('@strapi/strapi').factories

module.exports = createCoreRouter('api::restaurant.restaurant', {
  config: {
    find: {
      // @ts-ignore
      roles: ['authenticated', 'public'],
    },
    create: {
      // @ts-ignore
      roles: ['authenticated'],
    },
    findOne: {
      // @ts-ignore
      roles: ['authenticated', 'public'],
    },
    update: {
      // @ts-ignore
      roles: ['authenticated'],
    },
    delete: {
      // @ts-ignore
      roles: ['authenticated'],
    },
  },
})

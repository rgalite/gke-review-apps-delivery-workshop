export function getRestaurants(params = {}) {
  const { sort } = params
  const url = new URL(`${process.env.STRAPI_API_URL}/restaurants`)

  if (sort) {
    url.searchParams.append('sort', sort)
  }

  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((response) => {
    if (!response.ok) {
      const error = new Error(response.statusText)
      error.response = response

      throw error
    }

    return response.json()
  })
}

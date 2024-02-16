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
  }).then((response) => response.json())
}

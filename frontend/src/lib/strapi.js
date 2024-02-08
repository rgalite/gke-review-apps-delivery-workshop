export function getRestaurants() {
  return fetch(`${process.env.STRAPI_API_URL}/restaurants`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
    },
  }).then((response) => response.json())
}

'use client'
import React from 'react'
import ReactStars from 'react-stars'

export default function RestaurantListItem({
  name,
  address,
  rating,
  numberOfReviews,
}) {
  return (
    <div className="p-2 border border-gray-200 rounded">
      <div className="font-semibold mb-4">{name}</div>
      <div className="font-semibold flex items-center mb-2 text-sm">
        <ReactStars count={5} value={rating} edit={false} size={16} />
        <div className="ml-2">{numberOfReviews} reviews</div>
      </div>
      <div>{address}</div>
    </div>
  )
}

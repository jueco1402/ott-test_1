import React from 'react'

export const SectionTitle = ({title,subTitle}) => {
  return (
    <div className='mt-15 mb-5'>
      <h2 className='text-5xl font-bold'>{title}</h2>
      <p className='text-xl text-gray-700 mt-2'>{subTitle}</p>
    </div>
  )
}

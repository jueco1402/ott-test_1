import React, { useEffect } from 'react'
import { useHeartStore } from '../store/useHeartStore'
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const Heart = () => {
  const { hearts,onLoadHearts,onRemoveHearts } = useHeartStore();
  const { user, currentMember } = useAuthStore();
  useEffect(()=>{
    onLoadHearts();
  },[user,currentMember])
  return (
    <section className='sub-page pt-25'>
      <div className="inner">
        <h2 className="section-title text-3xl font-bold">찜리스트</h2>
        <div>
          <ul className='grid grid-cols-5 gap-5'>
            {hearts.map((h) => (
              <li key={h.id}>
                <Link to={``}>
                  <div><img src={`https://image.tmdb.org/t/p/w500${h.poster_path}`} alt="" /></div>
                  <h3>{h.title}</h3>
                </Link>
                <button className='bg-blue-600 text-white p-2'
                onClick={()=>onRemoveHearts(h.id)}>제거</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

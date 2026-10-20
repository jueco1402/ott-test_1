import React, { useEffect, useState } from 'react'
import { useMovieStore } from '../store/useMovieStore'

export const HeroSection = () => {
  //전역변수 무비,무비불러오기
  const { popMovies, onFetchPopular, popVideo, onFetchVideo } = useMovieStore();
  const [hover,setHover] = useState(false);

  //인기영화중 첫번째
  const heroMovie = popMovies[0];

  //인기영화중 첫번째 영화의 영상정보 가져오기
  useEffect(() => {
    if (heroMovie) {
      onFetchVideo(heroMovie.id)
    }
  }, [heroMovie])

  //데이터가 다 불러지고 나면 아래로 실행이 내려가도록
  if (!heroMovie) return;

  console.log("첫번째영화???", heroMovie)

  //영상정보 불러오기
  const video = popVideo[heroMovie.id];

  //예고 편이 들어있는 영상 찾기
  //video? ?뜻은 video가 존재할 경우만 뒤에 실행해라
  const trailer = video?.find((video) => video.site === "YouTube" && video.type === "Trailer")
  console.log("전체영상,트레일러", video, trailer);
  //년도 추출하기
  const releaseYear = heroMovie.release_date ? new Date(heroMovie.release_date).getFullYear() : ""


  return (
    <div className='hero-wrap relative'
    onMouseEnter={()=>setHover(true)}
    onMouseLeave={()=>setHover(false)}
    >
      <div>
        <div className="img-box w-full h-screen bg-cover bg-center"
          style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${heroMovie.backdrop_path})` }}>
          {hover && trailer && <iframe className='w-full h-screen'
            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1`} ></iframe>}
        </div>
        <div className="absolute bg-linear-to-r from-black to-transparent inset-0"></div>
        <div className="text-box absolute bottom-20 left-50">
          <h2 className='text-white text-7xl mb-5 font-bold'>{heroMovie.title}</h2>
          <p className='text-white/60 w-180 break-keep mb-10'>{heroMovie.overview}</p>
          <div className='text-white/90 flex gap-5 mb-2'>
            <strong>{releaseYear}</strong>
            <span className='bg-blue-700 rounded-sm px-1'>15</span>
          </div>
          <div className='flex gap-5'>
            <button><img src="/images/icons/icon-play-default.svg" alt="" className='w-16' /></button>
            <button><img src="/images/icons/icon-heart-default.svg" alt="" className='w-16' /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

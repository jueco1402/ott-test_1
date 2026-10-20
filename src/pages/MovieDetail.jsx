import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMovieStore } from '../store/useMovieStore';

export const MovieDetail = () => {
  // 주소줄에 매개 값을 받아서 사용하기
  const {id} = useParams();
  const movieId = Number(id);
  const {popMovies,popVideo,onFetchVideo} = useMovieStore();

  console.log("주소 파라매터", id);
  // const {popMovies} = useMovieStore();
  //팝업창을 체크하기 위한 변수
  const[showPopup,setShowPopup]=useState(false);
  const handlePopup = () => {
    setShowPopup(true);
  }
  const handleClose = () => {
    setShowPopup(false);
  }

  //파라메터로 넘어온 영화 id와 같은 영화를 popMovies에서 찾기
  const movie = popMovies.find((m)=>m.id ===movieId)
  console.log(movie);
  //영화 id에 해당하는 영상 가져오기
  useEffect(()=>{
    if(movieId){
      onFetchVideo(movieId)
    }
  },[movieId, onFetchVideo])
  //영상정보
  const video = popVideo[movieId];
  const trailer = video?.find((v)=>v.site==="YouTube" && v.type==="Trailer")
  return (
    <section className='sub-page pt-30'>
      <div className="inner flex gap-15">
        <div className='w-2/6'>
          <img src={`https://image.tmdb.org/t/p/original${movie?.poster_path}`} alt="" />
        </div>
        <div className='w-4/6'>
          <h2 className='text-5xl'>{movie?.title}</h2>
          <p>{movie?.vote_average}</p>
          <p className='my-10'>{movie?.overview}</p>
          <div className='flex gap-5'>
            <button className='bg-black text-white p-4' onClick={handlePopup}>재생하기</button>
            <button className='border p-4'>찜하기</button>
          </div>
        </div>
      </div>
      {showPopup &&(
        <div className='fixed bg-black w-full h-full top-0 z-10000'>
        <button className='absolute right-5 top-5 bg-white p-2' onClick={handleClose}>닫기</button>
        <iframe className='w-full h-full' src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1`} frameborder="0"></iframe>
      </div>
      )}
      
    </section>
  )
}

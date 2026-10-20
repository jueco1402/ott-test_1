import React, { useEffect } from 'react'
import { HeroSection } from '../components/HeroSection'
import { useMovieStore } from '../store/useMovieStore'
import { MovieList } from '../components/MovieList';
import { TvList } from '../components/TvList';

export const Home = () => {
  const { onFetchPopular, onFetchTv } = useMovieStore();
  //useEffect로 Home 컴포넌트가 렌더링될 때 한번만 실행
  useEffect(() => {
    onFetchPopular();
    onFetchTv();
  }, [])
  return (
    <main>
      {/* hero 100% 인기영화 첫번째*/}
      <HeroSection />
      <div className="inner">
        {/* 시청중 리스트 */}
        {/* 인기영화 리스트 */}
        <MovieList />
        {/* tv 리스트 */}
        <TvList/>
      </div>
    </main>
  )
}

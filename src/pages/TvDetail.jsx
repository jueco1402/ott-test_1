import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMovieStore } from '../store/useMovieStore';

export const TvDetail = () => {
  const { id } = useParams();
  const tvId = Number(id);

  const {
    tvs,
    tvDetail,
    tvVideo,
    episodes,
    episodeVideos,
    onFetchTvDetail,
    onFetchTvVideo,
    onFetchEpisode,
    onFetchEpisodeVideo,
    onFetchYoutubeSearch // [추가] 스토어에서 유튜브 검색 메서드 가져오기
  } = useMovieStore();

  const [showPopup, setShowPopup] = useState(false);
  const [activeEpisodeVideo, setActiveEpisodeVideo] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);

  const handlePopup = () => {
    setShowPopup(true);
  };
  const handleClose = () => {
    setShowPopup(false);
    setActiveEpisodeVideo(null);
  };

  const tv = tvs.find((t) => t.id === tvId);
  const detail = tvDetail[tvId];

  useEffect(() => {
    if (tvId) {
      onFetchTvDetail(tvId);
      onFetchTvVideo(tvId);
    }
  }, [tvId, onFetchTvDetail, onFetchTvVideo]);

  useEffect(() => {
    if (tvId && selectedSeason) {
      onFetchEpisode(tvId, selectedSeason);
    }
  }, [tvId, selectedSeason, onFetchEpisode]);

  const video = tvVideo[tvId];
  const trailer = video?.find((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));

  const currentEpisodes = episodes[`${tvId}_${selectedSeason}`] || [];

  // 에피소드 재생 버튼 클릭 핸들러
  const handleEpisodePlay = async (episodeNumber, episodeName) => {
    // 1. TMDB 에피소드 비디오 먼저 확인
    await onFetchEpisodeVideo(tvId, selectedSeason, episodeNumber);
    const vList = episodeVideos[`${tvId}_${selectedSeason}_${episodeNumber}`];
    const epTrailer = vList?.find((v) => v.site === "YouTube");

    if (epTrailer) {
      setActiveEpisodeVideo(epTrailer.key);
      return;
    }

    // 2. TMDB에 영상이 없다면 유튜브 검색 API 활용
    const tvName = tv?.name || detail?.name || "TV Show";
    // [수정] episodeNumber화 -> ${episodeNumber}화 로 올바르게 수정
    const searchQuery = `${tvName} 시즌 ${selectedSeason} ${episodeNumber}화 ${episodeName}`;
    const queryKey = `${tvId}_s${selectedSeason}_e${episodeNumber}`;

    const youtubeVideoId = await onFetchYoutubeSearch(queryKey, searchQuery);

    if (youtubeVideoId) {
      setActiveEpisodeVideo(youtubeVideoId);
    } else {
      alert("관련된 유튜브 영상을 찾을 수 없습니다.");
    }
  };

  return (
    <section className='sub-page pt-30'>
      <div className="inner flex flex-col gap-15">
        {/* 상단 정보 영역 */}
        <div className='flex gap-15'>
          <div className='w-2/6'>
            <img
              src={`https://image.tmdb.org/t/p/original${tv?.poster_path || detail?.poster_path}`}
              alt={tv?.name || detail?.name}
            />
          </div>
          <div className='w-4/6'>
            <h2 className='text-5xl font-bold'>{tv?.name || detail?.name}</h2>
            <p className='text-lg text-gray-600 mt-2'>평점: {tv?.vote_average || detail?.vote_average}</p>
            <p className='my-10'>{tv?.overview || detail?.overview}</p>
            <div className='flex gap-5'>
              <button className='bg-black text-white p-4 cursor-pointer' onClick={handlePopup}>재생하기</button>
              <button className='border p-4 cursor-pointer'>찜하기</button>
            </div>
          </div>
        </div>

        {/* 하단 시즌 및 에피소드 목록 영역 */}
        <div className='mt-10'>
          <div className='flex justify-between items-center mb-6'>
            <h3 className='text-3xl font-bold'>에피소드</h3>

            {detail?.seasons && (
              <select
                className='border p-2 rounded cursor-pointer'
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
              >
                {detail.seasons.map((season) => (
                  <option key={season.id} value={season.season_number}>
                    {season.name} ({season.episode_count}부작)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {currentEpisodes.map((ep) => (
              <div key={ep.id} className='border rounded-lg overflow-hidden shadow-sm bg-white flex flex-col justify-between'>
                <div>
                  {ep.still_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${ep.still_path}`}
                      alt={ep.name}
                      className='w-full h-40 object-cover'
                    />
                  ) : (
                    <div className='w-full h-40 bg-gray-200 flex items-center justify-center text-gray-400'>이미지 없음</div>
                  )}
                  <div className='p-4'>
                    <h4 className='font-bold text-lg'>{ep.episode_number}. {ep.name}</h4>
                    <p className='text-sm text-gray-500 mt-1'>방영일: {ep.air_date}</p>
                    <p className='text-sm mt-3 line-clamp-2 text-gray-700'>{ep.overview || "등록된 줄거리가 없습니다."}</p>
                  </div>
                </div>
                <div className='p-4 pt-0'>
                  <button
                    className='w-full bg-gray-800 text-white py-2 rounded text-sm hover:bg-black cursor-pointer'
                    onClick={() => handleEpisodePlay(ep.episode_number, ep.name)}
                  >
                    에피소드 재생
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 예고편 재생 팝업 */}
      {showPopup && trailer && (
        <div className='fixed inset-0 bg-black w-full h-full top-0 z-50 flex items-center justify-center'>
          <button className='absolute right-5 top-5 bg-white p-2 z-50 cursor-pointer' onClick={handleClose}>닫기</button>
          <iframe
            className='w-full h-full'
            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1`}
            title="TV Trailer"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}

      {/* 개별 에피소드 재생 팝업 */}
      {activeEpisodeVideo && (
        <div className='fixed inset-0 bg-black w-full h-full top-0 z-50 flex items-center justify-center'>
          <button className='absolute right-5 top-5 bg-white p-2 z-50 cursor-pointer' onClick={handleClose}>닫기</button>
          <iframe
            className='w-full h-full'
            src={`https://www.youtube.com/embed/${activeEpisodeVideo}?autoplay=1&mute=1`}
            title="Episode Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </section>
  );
};

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMovieStore } from '../store/useMovieStore'
import { useHeartStore } from '../store/useHeartStore';
import { useAuthStore } from '../store/useAuthStore';

export const ListCard = ({ item, type }) => {
    const { popVideo, tvVideo, onFetchVideo, onFetchTvVideo } = useMovieStore();

    const [hover, setHover] = useState(false);

    // 영화와 TV 영상 구분
    const videos = type === "movie"
        ? popVideo[item.id]
        : tvVideo[item.id];

    // 예고편 찾기
    const trailer =
        videos?.find(v => v.site === "YouTube" && v.type === "Trailer") ||
        videos?.find(v => v.site === "YouTube" && v.type === "Teaser");

    // 마우스 올렸을 때
    const handleMouseEnter = () => {
        setHover(true);

        if (type === "movie") {
            if (!popVideo[item.id]) onFetchVideo(item.id);
        } else {
            if (!tvVideo[item.id]) onFetchTvVideo(item.id);
        }
    };

    // 마우스 벗어났을 때
    const handleMouseLeave = () => {
        setHover(false);
    };

    // 상세페이지 경로
    const detailPath = type === "movie"
        ? `/movie/${item.id}`
        : `/tv/${item.id}`;

    // 영화 title, TV name 구분
    const title = type === "movie" ? item.title : item.name;

    //찜하기
    const {user} = useAuthStore();
    const {hearts, onAddHearts, onIsHeart, onToggleHeart}=useHeartStore();
    // const hearted = onIsHeart(item.id);
    const hearted = hearts.some((h)=>h.id === item.id)
    const handleHeart = async()=>{
      if(!user){
        alert("로그인이 필요합니다");
        return 
      }
      
      await onAddHearts(item);
    }

    return (
        <li
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="relative">
                <img
                    className="w-full"
                    src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
                    alt={title}
                />

                {/* 마우스 오버 영역 */}
                {hover && (
                    <div className="absolute left-0 top-0 w-full z-50 bg-black z-1000">

                        {/* 예고 영상 */}
                        {trailer ? (
                            <iframe
                                className="w-full h-50"
                                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1`}
                                title={title}
                                allow="autoplay; encrypted-media"
                            />
                        ) : (
                            <img
                                className="w-full"
                                src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
                                alt={title}
                            />
                        )}

                        <div className="bg-black p-4 text-white">
                            <h3>{title}</h3>

                            <div className="flex gap-2 mt-5">
                                <button>
                                    <img src="/images/icons/icon-play-sm.svg" alt="재생" />
                                </button>

                                <button onClick={() => onToggleHeart(item)}>
                                    <img src={hearted ? "/images/icons/icon-heart-active.svg":"/images/icons/icon-heart-sm.svg"} alt="찜하기" />
                                </button>

                                <Link to={detailPath}>
                                    <img
                                        className="bg-white rounded-4xl w-14"
                                        src="/images/icons/arrow-circle.svg"
                                        alt="상세보기"
                                    />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 영화 또는 TV 정보 */}
            <Link to={detailPath}>
                <h3>{title}</h3>
                <p>★ {item.vote_average?.toFixed(1)}</p>
            </Link>
        </li>
    );
};

import { create } from "zustand";

//TMDB키를 변수로 저장하기
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY
export const useMovieStore = create((set, get) => ({
  // ######### 영화 (인기)
  //인기영화를 저장할 배열
  popMovies: [],
  //인기영화를 불러올 메서드
  onFetchPopular: async () => {
    const res = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&language=ko-KR&page=1`)
    console.log(res);
    const data = await res.json();
    console.log(data);
    set({ popMovies: data.results })
  },
  // 영화의 비디오를 저장할 변수
  popVideo: {},
  // 영화의 비디오를 불러오는 메서드
  onFetchVideo: async (id) => {
    //기존에 불러온 영상이 있는지를 체크해서 있으면 그만 불러와야지?
    const { popVideo } = get();
    if (popVideo[id]) return;

    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_KEY}&language=ko-KR`)
    console.log("비디오", res)
    const data = await res.json();
    console.log("비디오 데이터", data)
    set((state) => ({
      popVideo: {
        ...state.popVideo,
        [id]: data.results
      }
    }))
  },
  // ######### 티비 (인기)
  // 인기티비프로그램을 저장할 배열
  tvs: [],
  // 인기티비프로그램의 영상을 저장할 오브젝트
  tvVideo: {},
  // 인기 티비프로그램을 불러올 메서드
  onFetchTv: async () => {
    const res = await fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_KEY}&language=ko-KR&page=1`)
    const data = await res.json();
    console.log("인기티비", data);
    set({ tvs: data.results })
  },
  // 인기 티비프로그램의 영상을 불러올 메서드
  onFetchTvVideo: async (id) => {
    const { tvVideo } = get();
    if (tvVideo[id]) return;
    const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/videos?api_key=${TMDB_KEY}&language=en-US`);
    const data = await res.json();
    set((state) => ({
      tvVideo: {
        ...state.tvVideo,
        [id]: data.results
      }
    }))
  },
  tvDetail: {}, // TV 상세 정보 (시즌 배열 포함) 저장을 위한 객체
  episodes: {}, // 시즌별 에피소드 저장을 위한 객체 (key: `${tvId}_${seasonNumber}`)
  // [추가] TV 상세 정보 불러오기 (시즌 정보 포함)
  onFetchTvDetail: async (id) => {
    const { tvDetail } = get();
    if (tvDetail[id]) return;

    const res = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=ko-KR`);
    const data = await res.json();
    set((state) => ({
      tvDetail: {
        ...state.tvDetail,
        [id]: data,
      },
    }));
  },

  // [추가] 특정 TV 프로그램의 시즌별 에피소드 불러오기
  onFetchEpisode: async (id, seasonNumber) => {
    const key = `${id}_${seasonNumber}`;
    const { episodes } = get();
    if (episodes[key]) return;

    const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}?api_key=${TMDB_KEY}&language=ko-KR`);
    const data = await res.json();
    set((state) => ({
      episodes: {
        ...state.episodes,
        [key]: data.episodes, // 해당 시즌의 에피소드 배열 저장
      },
    }));
  },
  // [추가] 특정 에피소드의 비디오(유튜브 영상 등)를 불러오는 메서드
  episodeVideos: {}, // [추가] 에피소드별 비디오 저장을 위한 객체 (key: `${tvId}_${seasonNumber}_${episodeNumber}`)
  onFetchEpisodeVideo: async (id, seasonNumber, episodeNumber) => {
    const key = `${id}_${seasonNumber}_${episodeNumber}`;
    const { episodeVideos } = get();
    if (episodeVideos[key]) return;

    const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}/episode/${episodeNumber}/videos?api_key=${TMDB_KEY}&language=ko-KR`);
    const data = await res.json();
    set((state) => ({
      episodeVideos: {
        ...state.episodeVideos,
        [key]: data.results,
      },
    }));
  },

  youtubeVideos: {},
  onFetchYoutubeSearch: async (queryKey, searchQuery) => {
    const { youtubeVideos } = get();
    if (youtubeVideos[queryKey]) return youtubeVideos[queryKey];

    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          searchQuery
        )}&key=${YOUTUBE_KEY}&maxResults=1&type=video`
      );
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        const videoId = data.items[0].id.videoId;
        set((state) => ({
          youtubeVideos: {
            ...state.youtubeVideos,
            [queryKey]: videoId,
          },
        }));
        return videoId;
      }
      return null;
    } catch (error) {
      console.error("유튜브 검색 에러:", error);
      return null;
    }
  },
}))
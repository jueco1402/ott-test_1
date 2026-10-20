
import React from 'react'
import { SectionTitle } from './SectionTitle'
import { ListCard } from './ListCard'
import { useMovieStore } from '../store/useMovieStore'

export const MovieList = () => {
    const { popMovies } = useMovieStore();

    return (
        <section>
            <div className="inner">
                <SectionTitle
                    title="인기영화"
                    subTitle="최신 인기 영화를 즐겨보세요!"
                />

                <ul className="grid grid-cols-4 gap-5">
                    {popMovies.map(movie => (
                        <ListCard
                            key={movie.id}
                            item={movie}
                            type="movie"
                        />
                    ))}
                </ul>
            </div>
        </section>
    );
};

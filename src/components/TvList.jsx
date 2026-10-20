
import React from 'react'
import { SectionTitle } from './SectionTitle'
import { ListCard } from './ListCard'
import { useMovieStore } from '../store/useMovieStore'

export const TvList = () => {
    const { tvs } = useMovieStore();

    return (
        <section>
            <div className="inner">
                <SectionTitle
                    title="인기TV"
                    subTitle="현재 TV에 방영중인 인기 프로그램을 즐겨보세요"
                />

                <ul className="grid grid-cols-4 gap-5">
                    {tvs.map(tv => (
                        <ListCard
                            key={tv.id}
                            item={tv}
                            type="tv"
                        />
                    ))}
                </ul>
            </div>
        </section>
    );
};

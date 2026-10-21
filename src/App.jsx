import './App.css'
import { Sports } from './pages/Sports'
import { Heart } from './pages/Heart'
import { Home } from './pages/Home'
import { Join } from './pages/Join'
import { AnimatePage } from './pages/AnimatePage'
import { Login } from './pages/Login'
import { Movie } from './pages/Movie'
import { New } from './pages/New'
import { Profile } from './pages/Profile'
import { Series } from './pages/Series'
import { MovieDetail } from './pages/MovieDetail'
import { TvDetail } from './pages/TvDetail'
import { SelectMember } from './pages/SelectMember'
import { Footer } from './components/Footer'
import { Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'

function App() {
  return (
    <>
    <Header/>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie" element={<Movie />} />
        <Route path="/series" element={<Series />} />
        <Route path="/new" element={<New />} />
        <Route path="/animate" element={<AnimatePage />} />
        <Route path="/heart" element={<Heart />} />
        <Route path="/sports" element={<Sports />} />
        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/tv/:id" element={<TvDetail />} />

        <Route path="/login" element={<Login />} />
        <Route path="/selectMember" element={<SelectMember />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/join" element={<Join />} />
      </Routes>
      <Footer />
    </>
  )
}

export default App

import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore';

//메인메뉴
const mainMenu = [
  { id: 1, menu: "영화", path: "/movie" },
  { id: 2, menu: "시리즈", path: "/series" },
  { id: 3, menu: "NEW 요즘 대세 콘텐츠", path: "/new" },
  { id: 4, menu: "애니메이션", path: "/animate" },
  { id: 5, menu: "찜리스트", path: "/heart" },
]
const familys = ["아빠", "엄마", "아들", "딸"];
export const Header = () => {
  //경로 변경
  const navigate=useNavigate();
  //현재 경로 알아내기
  const location = useLocation();
  const { user,currentMember,onSetMember,onLogout } = useAuthStore();
  //서브메뉴를 보여줄 것 체크할 변수
  const [showProfile,setShowProfile]=useState(false);
  //서브메뉴를 보여줄 메서드
  //사용자를 변경시 멤버 변경 메서드

  const handleChangeMember = (member) => {
    onSetMember(member);
    setShowProfile(false);
  }
  //로그아웃
  const handleLogout = ()=>{
    onLogout();
    navigate("/");
  }

  const isHome = location.pathname === "/";
  console.log(isHome);
  return (
    <header className={`fixed z-10000 w-full py-5 
    ${isHome ? "bg-transparent" : "bg-green-500"}`}>
      <div className="inner flex justify-between items-center">
        <div className="header-left flex gap-10 items-center">
          <h1><Link to="/"><img src="/images/logo.png" alt="" className='w-40' /></Link></h1>
          <ul className='flex gap-5'>
            {mainMenu.map((menu) => (
              <li key={menu.id}>
                <Link className={`${isHome ? "text-white" : "text-black"}`} to={menu.path}>{menu.menu}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className={`header-right ${isHome ? "text-white" : "text-black"}`}>
          <ul className='flex gap-5'>
            <li><button>검색</button></li>
            {user ? (
            <>
              <li><button onClick={()=>setShowProfile(true)}>{currentMember || "프로필"}</button>
              {showProfile && (
                <div className='absoulte bg-white p-2 border text-black'>
                <p></p>
                <ul>
                  {familys.map((f)=>(
                    <li><button onClick={()=>handleChangeMember(f)}>{f}</button></li>
                  ))}
                </ul>
                <button onClick={handleLogout}>로그아웃</button>
              </div>
              )}
              </li>
              
            </>
            ) : (
              <>
                <li><Link to="/login">로그인</Link></li>
                <li><Link to="join">회원가입</Link></li>
              </>
            )}
          </ul>
        </div>
      </div >
    </header >
  )
}

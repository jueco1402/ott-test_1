import { create } from "zustand";
import { auth, db, googleProvider } from "../firebase/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const useAuthStore=create((set)=>({
  //사용자 정보를 저장할 변수
  user:null,
  authError:"",
  //사용자 안에는 아빠, 엄마, 아들, 딸 멤버에 대한 정보를 저장할 변수
  currentMember:null,
  //사용자정보 초기화작업 메서드
  //멤버들 변경할 메서드
  onSetMember:(memeber)=>{
    set({currentMember:memeber});
  },
  //구글 로그인
  onGoogleLogin:async()=>{
    if (!auth || !db) {
      set({authError:"Firebase 로그인 설정이 없습니다. 관리자에게 환경 설정을 요청해 주세요."});
      return null;
    }
    set({authError:""});
    try{
      // 구글 팝업 로그인
      const result = await signInWithPopup(auth,googleProvider);
      const user=result.user;
      //firestore에 사용자 문서확인
      const userRef = doc(db,"users",user.uid);
      const userDoc = await getDoc(userRef);
      //신규 사용자이면 firestore에 저장
      if(!userDoc.exists()){
        const userInfo = {
          uid:user.uid,
          email:user.email,
          name:user.displayName,
          photoURL:user.photoURL,
          phone:user.phoneNumber,
          familyMembers:{
            아빠:{likes:[],watchHistory:[]},
            엄마:{likes:[],watchHistory:[]},
            아들:{likes:[],watchHistory:[]},
            딸:{likes:[],watchHistory:[]}
          }
        }
        //firestore에 저장하기
        await setDoc(userRef,userInfo);
        set({user:userInfo})
      }
      else{
        set({user:userDoc.data()})
      }
      return user;
    }
    catch(err){
      const messages = {
        "auth/popup-closed-by-user": "로그인 창이 닫혔습니다. 다시 시도해 주세요.",
        "auth/unauthorized-domain": "Firebase에서 승인되지 않은 사이트입니다. 승인 도메인을 확인해 주세요.",
        "auth/popup-blocked": "브라우저가 로그인 팝업을 차단했습니다. 팝업을 허용해 주세요."
      };
      set({authError:messages[err.code] || "로그인하지 못했습니다. 인증 설정과 네트워크를 확인해 주세요."});
    }
  },
  //로그아웃 메서드
  onLogout:async()=>{
    try{
      await signOut(auth);
      set({
        user:null,
        currentMember:null
      });
    }
    catch(err){
      set({authError:err.code === "auth/network-request-failed" ? "네트워크 오류로 로그아웃하지 못했습니다." : "로그아웃하지 못했습니다. 다시 시도해 주세요."});
    }
  }
}))
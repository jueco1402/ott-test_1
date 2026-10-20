import { create } from "zustand";
import { auth, db, googleProvider } from "../firebase/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const useAuthStore=create((set)=>({
  //사용자 정보를 저장할 변수
  user:null,
  //사용자 안에는 아빠, 엄마, 아들, 딸 멤버에 대한 정보를 저장할 변수
  currentMember:null,
  //사용자정보 초기화작업 메서드
  //멤버들 변경할 메서드
  onSetMember:(memeber)=>{
    console.log(memeber);
    set({currentMember:memeber});
  },
  //구글 로그인
  onGoogleLogin:async()=>{
    try{
      // 구글 팝업 로그인
      const result = await signInWithPopup(auth,googleProvider);
      console.log(result);
      const user=result.user;
      //firestore에 사용자 문서확인
      const userRef = doc(db,"users",user.uid);
      const userDoc = await getDoc(userRef);
      console.log("가져온정보", userDoc.data());
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
      console.log("구글 로그인에러 :", err.message)
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
      console.log("로그아웃에러 : ",err.message);
    }
  }
}))
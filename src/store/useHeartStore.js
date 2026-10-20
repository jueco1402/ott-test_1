import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase/firebase"; // auth 임포트도 추가되어 있는지 확인해주세요!

export const useHeartStore = create((set, get) => ({
  // 찜리스트 저장할 배열 (hearts로 통일)
  hearts: [],

  // 찜리스트를 배열에 저장할 메서드
  onAddHearts: async (item) => {
    const user = auth.currentUser;
    console.log(user)
    if (!user) return;

    // 잘못된 쉼표 문법 수정
    const currentMember = useAuthStore.getState().currentMember;
    console.log("선택멤버", currentMember)
    if (!currentMember) return;

    try {
      const heartItem = {
        id: item.id,
        // item 안에 title 항목이 있는지 체크해서 있으면 title을 사용하고 없으면 name을 사용
        title: "title" in item ? item.title : item.name,
        poster_path: item.poster_path,
      };

      // firebase 저장하기
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      console.log(userDoc);

      if (userDoc.exists()) {
        // 이전에 저장된 자료를 가져와서
        const prevHeart =
          userDoc.data()?.familyMembers?.[currentMember]?.likes || [];

        // 내가 찜한 항목과 일치하지 않는 것만 남기기
        const filterd = prevHeart.filter((h) => h.id !== item.id);

        // 추가로 넣기
        const newHeart = [heartItem, ...filterd];

        // firebase 자료를 업데이트하기
        await updateDoc(userDocRef, {
          [`familyMembers.${currentMember}.likes`]: newHeart,
        });

        // zustand 변수에도 자료 업데이트
        set({ hearts: newHeart });
        console.log(newHeart);
        console.log("list", get().hearts);
      }
    } catch (err) {
      console.log("찜오류", err.message);
    }
  },
  //저장된 찜리스트 불러오기
  // onLoadHearts : async() => {
  //   const user = auth.currentUser;
  //   if (!user) return;
  //   const currentMember = useAuthStore.getState().currentMember;

  //   console.log("로드할때 사용자:",currentMember)
  //   if (!currentMember) return;
  //   try{
  //     //firebase 사용자계정
  //     const userDocRef = doc(db,"users",user.uid);
  //     const userDoc = await getDoc(userDocRef);
  //     if(userDoc.exists()){
  //       const likes = userDoc.data()?.familyMembers?.[currentMember]?.likes || []
  //       set({hearts:likes})
  //     }
  //   }
  //   catch(err){
  //     console.log("찜리스트 불러오기 오류",err)
  //   }
  // },
  // 저장된 찜리스트 불러오기
  onLoadHearts: async () => {
    const user = auth.currentUser;
    if (!user) return;
    const currentMember = useAuthStore.getState().currentMember;
    if (!currentMember) return;
    try {
      //firebase 사용자계정
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const likes = userDoc.data()?.familyMembers?.[currentMember]?.likes || []
        set({ hearts: likes })
      }
    }
    catch (err) {
      console.log("찜리스트 불러오기 오류", err)
    }
  },
  //토글
  onToggleHeart: async (item) => {
    const isAlreadyHearted = get().onIsHeart(item.id);
    if (isAlreadyHearted) {
      await get().onRemoveHearts(item.id);
    } else {
      await get().onAddHearts(item);
    }
  },
  //삭제
  onRemoveHearts: async (id) => {
    const user = auth.currentUser;
    if (!user) return;
    const currentMember = useAuthStore.getState().currentMember;
    if (!currentMember) return;
    try {
      //firebase 사용자계정
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {

        const likes = userDoc.data()?.familyMembers?.[currentMember]?.likes || []
        const filterd = likes.filter((h) => h.id !== id);

        await updateDoc(userDocRef, { [`familyMembers.${currentMember}.likes`]: filterd })
        set({ hearts: filterd })
        alert("찜삭제");
      }
    } catch (err) {
      console.log("찜삭제 오류", err);
    }
  },
  //하트의 상태를 변경해줄 메서드
  onIsHeart: (id) => {
    // some 데이터가 배열의 객체로 있는지를 체크해서 true/false를 반환한다
    return get().hearts.some((h) => h.id === id)
  }
}));
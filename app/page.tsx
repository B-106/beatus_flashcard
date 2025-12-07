"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Plus, MoreVertical, Trash2, Edit2, GripVertical, BookOpen } from "lucide-react"; // 아이콘들

// 박스(Deck) 타입 정의
type Deck = {
  id: number;
  title: string;
  description: string;
  is_wrong_note: boolean;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]); // 박스 목록
  const [loading, setLoading] = useState(true);

  // 모달(팝업) 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null); // 현재 열린 점세개 메뉴 ID

  // 1. 초기 데이터 로드
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        fetchDecks(user.id);
      }
      setLoading(false);
    };
    init();
  }, []);

  // 2. 박스 목록 가져오기 (오답노트 자동 생성 로직 포함)
  const fetchDecks = async (userId: string) => {
    let { data: myDecks, error } = await supabase
      .from("decks")
      .select("*")
      .order("is_wrong_note", { ascending: false }) // 오답노트가 맨 앞에 오게
      .order("order_index", { ascending: true }) // 그 다음엔 순서대로
      .order("created_at", { ascending: true });

    if (error) console.error(error);

    // 만약 오답노트가 하나도 없으면 자동으로 만들어줌 (기획 반영)
    const hasWrongNote = myDecks?.some(d => d.is_wrong_note);
    if (!hasWrongNote && myDecks) {
      const { data: newWrongDeck } = await supabase
        .from("decks")
        .insert({ user_id: userId, title: "오답노트", description: "자동 생성된 오답 박스입니다.", is_wrong_note: true })
        .select()
        .single();
      if (newWrongDeck) myDecks = [newWrongDeck, ...myDecks];
    }

    setDecks(myDecks || []);
  };

  // 3. 새 박스 추가하기
  const createDeck = async () => {
    if (!newTitle) return alert("박스 이름을 입력해주세요.");
    
    await supabase.from("decks").insert({
      user_id: user?.id,
      title: newTitle,
      description: newDesc,
      is_wrong_note: false,
    });

    setNewTitle("");
    setNewDesc("");
    setIsModalOpen(false);
    fetchDecks(user!.id); // 목록 새로고침
  };

  // 4. 박스 삭제하기
  const deleteDeck = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까? 안의 카드도 모두 사라집니다.")) return;
    await supabase.from("decks").delete().eq("id", id);
    setActiveMenuId(null);
    fetchDecks(user!.id);
  };

  // 로그아웃
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // 로딩 화면
  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">로딩 중...</div>;

  // 로그인 안 했을 때 (간략화)
  if (!user) return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white gap-4">
      <h1 className="text-3xl font-bold">My Own Flashcard</h1>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "http://localhost:3000" } })} className="bg-white text-black px-4 py-2 rounded font-bold">구글 로그인</button>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      {/* --- 상단 헤더 --- */}
      <div className="flex justify-between items-center mb-10 border-b border-gray-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold">My Flashcard</h1>
          <p className="text-gray-400 text-sm">반갑습니다, {user.user_metadata.full_name}님!</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-white underline">로그아웃</button>
      </div>

      {/* --- 메인 컨텐츠 영역 --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* 1. 박스 목록 렌더링 */}
        {decks.map((deck) => (
          <div 
            key={deck.id} 
            className={`relative group rounded-xl p-6 transition-all duration-200 border 
              ${deck.is_wrong_note 
                ? "bg-red-900/20 border-red-500/50 hover:bg-red-900/30" // 오답노트용 스타일
                : "bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-blue-500/50" // 일반 박스 스타일
              }`}
          >
            {/* 박스 내용 */}
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${deck.is_wrong_note ? "bg-red-500/20 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
                <BookOpen size={24} />
              </div>
              
              {/* 점 세개 메뉴 (오답노트는 삭제 불가하게 처리) */}
              {!deck.is_wrong_note && (
                <div className="relative">
                  <button onClick={() => setActiveMenuId(activeMenuId === deck.id ? null : deck.id)} className="text-gray-400 hover:text-white p-1">
                    <MoreVertical size={20} />
                  </button>
                  
                  {/* 드롭다운 메뉴 */}
                  {activeMenuId === deck.id && (
                    <div className="absolute right-0 mt-2 w-32 bg-gray-900 border border-gray-700 rounded shadow-xl z-10 overflow-hidden">
                      <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2">
                        <Edit2 size={14} /> 수정
                      </button>
                      <button onClick={() => deleteDeck(deck.id)} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2">
                        <Trash2 size={14} /> 삭제
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <h3 className="text-xl font-bold mb-1 truncate">{deck.title}</h3>
            <p className="text-sm text-gray-400 line-clamp-2 h-10">{deck.description || "설명이 없습니다."}</p>

            {/* 학습하러 가기 버튼 */}
            <button className={`w-full mt-6 py-2 rounded-lg font-bold text-sm transition-colors ${
              deck.is_wrong_note ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}>
              {deck.is_wrong_note ? "오답 복습하기" : "학습 시작"}
            </button>
          </div>
        ))}

        {/* 2. 박스 추가 버튼 (+) */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 hover:text-blue-400 hover:border-blue-500 hover:bg-gray-800/50 transition-all gap-4"
        >
          <div className="bg-gray-800 p-4 rounded-full">
            <Plus size={32} />
          </div>
          <span className="font-semibold">새 암기 박스 만들기</span>
        </button>

      </div>

      {/* --- 모달 (박스 추가 팝업) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4">새 박스 만들기</h2>
            <input 
              className="w-full bg-gray-700 p-3 rounded mb-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="박스 이름 (필수)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              autoFocus
            />
            <textarea 
              className="w-full bg-gray-700 p-3 rounded mb-6 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              placeholder="설명 (선택)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">취소</button>
              <button onClick={createDeck} className="px-6 py-2 bg-blue-600 rounded font-bold hover:bg-blue-500">생성하기</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
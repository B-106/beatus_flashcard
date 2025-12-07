"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Plus, MoreVertical, Trash2, Edit2, BookOpen, GripVertical } from "lucide-react";
import Link from "next/link";

// 드래그 앤 드롭 관련 라이브러리 (dnd-kit)
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// 박스 타입
type Deck = {
  id: number;
  title: string;
  description: string;
  is_wrong_note: boolean;
  order_index: number; // 순서 저장용
};


// [컴포넌트 1] 드래그 가능한 박스 컴포넌트 (따로 분리함)
function SortableDeckCard({ deck, activeMenuId, setActiveMenuId, deleteDeck }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deck.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto", // 드래그 중일 때 위로 띄우기
    opacity: isDragging ? 0.5 : 1, // 드래그 중일 때 반투명
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-xl p-6 transition-all duration-200 border bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-blue-500/50"
    >
      {/* 상단 영역 */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-2">
          {/* 아이콘 */}
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <BookOpen size={24} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* 드래그 손잡이 (이 아이콘을 잡고 드래그해야 함) */}
          <button {...attributes} {...listeners} className="text-gray-600 hover:text-white p-1 cursor-grab active:cursor-grabbing">
            <GripVertical size={20} />
          </button>

          {/* 점 세개 메뉴 */}
          <div className="relative">
            <button onClick={() => setActiveMenuId(activeMenuId === deck.id ? null : deck.id)} className="text-gray-400 hover:text-white p-1">
              <MoreVertical size={20} />
            </button>
            {activeMenuId === deck.id && (
              <div className="absolute right-0 mt-2 w-32 bg-gray-900 border border-gray-700 rounded shadow-xl z-20 overflow-hidden">
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 flex items-center gap-2">
                  <Edit2 size={14} /> 수정
                </button>
                <button onClick={() => deleteDeck(deck.id)} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2">
                  <Trash2 size={14} /> 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-1 truncate">{deck.title}</h3>
      <p className="text-sm text-gray-400 line-clamp-2 h-10">{deck.description || "설명이 없습니다."}</p>

      <Link href={`/study/${deck.id}`} className="block w-full mt-6">
          <button className="w-full py-2 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-700 transition-colors">학습 시작</button>
      </Link>
    </div>
  );
}


// [메인] Home 컴포넌트
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const [todayCount, setTodayCount] = useState(0);       // 오늘 공부한 카드 수
  const [todayAccuracy, setTodayAccuracy] = useState(0); // 오늘 정답률
  const [streak, setStreak] = useState(0);               // 연속 출석일
  const [attendedDates, setAttendedDates] = useState<Set<string>>(new Set()); // 출석한 날짜들 (달력용)

  // 모달 & 메뉴 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // 드래그 센서 설정 (클릭과 드래그 구분)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), // 8px 이상 움직여야 드래그로 인식
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchDecks(user.id);
        fetchStats(user.id); // <--- [추가] 통계 불러오기 함수 호출
      }
      setLoading(false);
    };
    init();
  }, []);

  const fetchStats = async (userId: string) => {
    // 1. 유저의 모든 학습 로그 가져오기 (날짜 최신순)
    const { data: logs } = await supabase
      .from("study_logs")
      .select("created_at, is_correct")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!logs || logs.length === 0) return;

    // --- A. 오늘 학습량 & 정답률 계산 ---
    const todayStr = new Date().toISOString().split("T")[0]; // "2023-12-07" 형식
    const todayLogs = logs.filter(log => log.created_at.startsWith(todayStr));
    
    setTodayCount(todayLogs.length);
    
    const correctCount = todayLogs.filter(log => log.is_correct).length;
    setTodayAccuracy(todayLogs.length > 0 ? Math.round((correctCount / todayLogs.length) * 100) : 0);

    // --- B. 캘린더 & 스트릭 계산 ---
    // 로그에서 날짜만 뽑아서 중복 제거 (Set 사용)
    const uniqueDates = Array.from(new Set(logs.map(log => log.created_at.split("T")[0])));
    setAttendedDates(new Set(uniqueDates)); // 달력에 찍을 용도

    // 스트릭 계산 (오늘 포함해서 과거로 연속된 날짜 세기)
    let currentStreak = 0;
    let checkDate = new Date(); // 오늘부터 시작
    
    // 만약 오늘 공부 안 했으면 어제부터 체크할지 결정
    // (여기서는 오늘 안 했어도 어제 했으면 스트릭 유지되는 로직으로 짬)
    const todayExists = uniqueDates.includes(todayStr);
    if (!todayExists) {
        // 오늘 기록이 없으면, 어제 기록이 있는지 확인. 어제도 없으면 스트릭 0.
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateString = checkDate.toISOString().split("T")[0];
      if (uniqueDates.includes(dateString)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1); // 하루 전으로 이동
      } else {
        break; // 끊기면 종료
      }
    }
    setStreak(currentStreak);
  };

  const fetchDecks = async (userId: string) => {
    let { data: myDecks, error } = await supabase
      .from("decks")
      .select("*")
      .order("is_wrong_note", { ascending: false }) // 1순위: 오답노트
      .order("order_index", { ascending: true })    // 2순위: 사용자가 정한 순서
      .order("created_at", { ascending: true });    // 3순위: 생성일

    if (error) console.error(error);

    // 오답노트 자동 생성 로직
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

  const createDeck = async () => {
    if (!newTitle) return alert("박스 이름을 입력해주세요.");
    
    // 새 박스는 가장 마지막 순서로 추가
    const maxOrder = decks.length > 0 ? Math.max(...decks.map(d => d.order_index || 0)) : 0;

    await supabase.from("decks").insert({
      user_id: user?.id,
      title: newTitle,
      description: newDesc,
      is_wrong_note: false,
      order_index: maxOrder + 1,
    });

    setNewTitle("");
    setNewDesc("");
    setIsModalOpen(false);
    fetchDecks(user!.id);
  };

  const deleteDeck = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("decks").delete().eq("id", id);
    setActiveMenuId(null);
    fetchDecks(user!.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // ▼ 드래그가 끝났을 때 실행되는 함수 (순서 변경 & DB 저장)
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setDecks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        // 1. 화면상에서 순서 즉시 변경 (UX 향상)
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // 2. DB에 변경된 순서 저장 (비동기)
        updateDeckOrder(newOrder);
        
        return newOrder;
      });
    }
  };

  // DB에 순서 업데이트
  const updateDeckOrder = async (newDecks: Deck[]) => {
    // 모든 박스의 순서를 다시 매겨서 업데이트 (배치 처리)
    const updates = newDecks.map((deck, index) => ({
      id: deck.id,
      order_index: index,
      user_id: user?.id, // RLS 통과용
    }));

    // upsert를 사용하여 여러 행을 한 번에 업데이트
    const { error } = await supabase.from("decks").upsert(updates);
    if (error) console.error("순서 저장 실패:", error);
  };


  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">로딩 중...</div>;
  if (!user) return <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center"><button onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "http://localhost:3000" } })}>구글 로그인</button></div>;

  // 오답노트(고정)와 나머지(드래그가능) 분리
  const wrongNoteDeck = decks.find(d => d.is_wrong_note);
  const draggableDecks = decks.filter(d => !d.is_wrong_note);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-10 border-b border-gray-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold">My Flashcard</h1>
          <p className="text-gray-400 text-sm">반갑습니다, {user.user_metadata.full_name}님!</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-white underline">로그아웃</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        
        {/* 1. 오늘의 학습량 카드 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col justify-between">
          <h3 className="text-gray-400 text-sm font-bold mb-2">TODAY'S LEARNING</h3>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-5xl font-black text-white">{todayCount}</span>
            <span className="text-gray-400 mb-2">Cards</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${todayAccuracy}%` }}></div>
          </div>
          <p className="text-sm text-gray-400 text-right">정답률 <span className="text-blue-400 font-bold">{todayAccuracy}%</span></p>
        </div>

        {/* 2. 스트릭 (불꽃 아이콘) */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex items-center justify-between relative overflow-hidden group">
          <div className="z-10">
            <h3 className="text-gray-400 text-sm font-bold mb-1">CURRENT STREAK</h3>
            <div className="text-5xl font-black text-white flex items-center gap-2">
              {streak} <span className="text-2xl text-gray-500">days</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              {streak > 0 ? "꾸준함이 재능을 이깁니다! 🔥" : "오늘 공부를 시작해서 불꽃을 피우세요!"}
            </p>
          </div>
          {/* 배경 장식용 불꽃 아이콘 */}
          <div className={`absolute -right-6 -bottom-6 text-9xl transition-all duration-500 ${streak > 0 ? "text-orange-500/20 group-hover:text-orange-500/30" : "text-gray-700/20"}`}>
            🔥
          </div>
        </div>

        {/* 3. 미니 캘린더 (이번 달 출석부) */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
          <h3 className="text-gray-400 text-sm font-bold mb-4 flex justify-between">
            <span>THIS MONTH</span>
            <span>{new Date().getMonth() + 1}월</span>
          </h3>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
            <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {/* 달력 날짜 생성 로직 (즉석 실행) */}
            {(() => {
              const today = new Date();
              const year = today.getFullYear();
              const month = today.getMonth();
              const firstDay = new Date(year, month, 1).getDay(); // 이번달 1일 요일
              const daysInMonth = new Date(year, month + 1, 0).getDate(); // 이번달 마지막 날짜
              
              const calendarCells = [];
              // 빈 칸 채우기
              for (let i = 0; i < firstDay; i++) {
                calendarCells.push(<div key={`empty-${i}`}></div>);
              }
              // 날짜 채우기
              for (let d = 1; d <= daysInMonth; d++) {
                // "YYYY-MM-DD" 포맷 만들기 (주의: 월/일이 한자리수일 때 0 붙여야 함)
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isAttended = attendedDates.has(dateStr); // 출석 여부 확인
                const isToday = d === today.getDate();

                calendarCells.push(
                  <div 
                    key={d} 
                    className={`aspect-square flex items-center justify-center rounded-full text-xs font-bold relative
                      ${isToday ? "border border-white text-white" : ""}
                      ${isAttended ? "bg-blue-500 text-black" : "text-gray-600"}
                    `}
                  >
                    {d}
                  </div>
                );
              }
              return calendarCells;
            })()}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* 1. 오답노트 (항상 맨 앞에 고정, 드래그 불가) */}
        {wrongNoteDeck && (
          <div className="relative group rounded-xl p-6 border bg-red-900/20 border-red-500/50 hover:bg-red-900/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-lg bg-red-500/20 text-red-400">
                <BookOpen size={24} />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-1">{wrongNoteDeck.title}</h3>
            <p className="text-sm text-gray-400 line-clamp-2 h-10">{wrongNoteDeck.description}</p>
            <Link href={`/study/${wrongNoteDeck.id}`} className="block w-full mt-6">
              <button className="w-full py-2 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-700 transition-colors">
                오답 복습하기
              </button>
            </Link>
          </div>
        )}

        {/* 2. 드래그 가능한 박스들 (DndContext로 감싸기) */}
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={draggableDecks.map(d => d.id)} 
            strategy={rectSortingStrategy} // 그리드 형태 드래그 전략
          >
            {draggableDecks.map((deck) => (
              <SortableDeckCard 
                key={deck.id} 
                deck={deck} 
                activeMenuId={activeMenuId} 
                setActiveMenuId={setActiveMenuId} 
                deleteDeck={deleteDeck} 
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* 3. 추가 버튼 (항상 맨 뒤) */}
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

      {/* 모달 (기존과 동일) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4">새 박스 만들기</h2>
            <input className="w-full bg-gray-700 p-3 rounded mb-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="박스 이름" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus />
            <textarea className="w-full bg-gray-700 p-3 rounded mb-6 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" placeholder="설명" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
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
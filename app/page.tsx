"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Plus, MoreVertical, Trash2, Edit2, GripVertical, BookOpen, BarChart2, Settings } from "lucide-react";
import Link from "next/link";

// 드래그 앤 드롭 관련 라이브러리
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// 박스 타입 정의
type Deck = {
  id: number;
  title: string;
  description: string;
  is_wrong_note: boolean;
  order_index: number;
};

// [컴포넌트] 드래그 가능한 박스
function SortableDeckCard({ deck, activeMenuId, setActiveMenuId, deleteDeck }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deck.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-xl p-6 transition-all duration-200 border 
        ${deck.is_wrong_note 
          ? "bg-red-900/20 border-red-500/50 hover:bg-red-900/30" 
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-500 shadow-sm"
        }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-2">
          <div className={`p-3 rounded-lg ${deck.is_wrong_note ? "bg-red-500/20 text-red-400" : "bg-blue-500/10 text-blue-500"}`}>
            <BookOpen size={24} />
          </div>
        </div>

        {!deck.is_wrong_note && (
          <div className="flex items-center gap-1">
            <button {...attributes} {...listeners} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 cursor-grab active:cursor-grabbing">
              <GripVertical size={20} />
            </button>
            <div className="relative">
              <button onClick={() => setActiveMenuId(activeMenuId === deck.id ? null : deck.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1">
                <MoreVertical size={20} />
              </button>
              {activeMenuId === deck.id && (
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-xl z-20 overflow-hidden">
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Edit2 size={14} /> 수정
                  </button>
                  <button onClick={() => deleteDeck(deck.id)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
                    <Trash2 size={14} /> 삭제
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <h3 className="text-xl font-bold mb-1 truncate text-gray-900 dark:text-white">{deck.title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10">{deck.description || "설명이 없습니다."}</p>

      <Link href={`/study/${deck.id}`} className="block w-full mt-6">
        <button className={`w-full py-2 rounded-lg font-bold text-sm text-white transition-colors ${
          deck.is_wrong_note ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
        }`}>
          {deck.is_wrong_note ? "오답 복습하기" : "학습 시작"}
        </button>
      </Link>
    </div>
  );
}

// [메인] Home 컴포넌트
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  // 대시보드 통계 상태
  const [todayCount, setTodayCount] = useState(0);
  const [todayAccuracy, setTodayAccuracy] = useState(0);
  const [streak, setStreak] = useState(0);
  const [attendedDates, setAttendedDates] = useState<Set<string>>(new Set());

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // 드래그 센서
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchDecks(user.id);
        fetchStats(user.id);
      }
      setLoading(false);
    };
    init();
  }, []);

  const fetchDecks = async (userId: string) => {
    let { data: myDecks, error } = await supabase
      .from("decks")
      .select("*")
      .order("is_wrong_note", { ascending: false })
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) console.error(error);

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

  const fetchStats = async (userId: string) => {
    const { data: logs } = await supabase
      .from("study_logs")
      .select("created_at, is_correct")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!logs || logs.length === 0) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const todayLogs = logs.filter(log => log.created_at.startsWith(todayStr));
    
    setTodayCount(todayLogs.length);
    const correctCount = todayLogs.filter(log => log.is_correct).length;
    setTodayAccuracy(todayLogs.length > 0 ? Math.round((correctCount / todayLogs.length) * 100) : 0);

    const uniqueDates = Array.from(new Set(logs.map(log => log.created_at.split("T")[0])));
    setAttendedDates(new Set(uniqueDates));

    let currentStreak = 0;
    let checkDate = new Date();
    const todayExists = uniqueDates.includes(todayStr);
    if (!todayExists) checkDate.setDate(checkDate.getDate() - 1);

    while (true) {
      const dateString = checkDate.toISOString().split("T")[0];
      if (uniqueDates.includes(dateString)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    setStreak(currentStreak);
  };

  const createDeck = async () => {
    if (!newTitle) return alert("박스 이름을 입력해주세요.");
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDecks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        updateDeckOrder(newOrder);
        return newOrder;
      });
    }
  };

  const updateDeckOrder = async (newDecks: Deck[]) => {
    const updates = newDecks.map((deck, index) => ({
      id: deck.id,
      order_index: index,
      user_id: user?.id,
    }));
    await supabase.from("decks").upsert(updates);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin, // ★ 핵심: 자동으로 주소 인식
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-900 dark:text-white">로딩 중...</div>;

  if (!user) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-6 p-4">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400">My Flashcard</h1>
        <p className="text-gray-600 dark:text-gray-400">나만의 지능형 암기 어시스턴트</p>
      </div>
      <button
        onClick={handleGoogleLogin}
        className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-8 py-4 rounded-xl font-bold flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24.81-.6z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        구글 계정으로 시작하기
      </button>
    </div>
  );

  // ▼▼▼ [메인 대시보드 화면] ▼▼▼
  const wrongNoteDeck = decks.find(d => d.is_wrong_note);
  const draggableDecks = decks.filter(d => !d.is_wrong_note);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8 transition-colors duration-300">
      <div className="flex justify-between items-center mb-10 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold">My Flashcard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">반갑습니다, {user.user_metadata.full_name}님!</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/statistics">
            <button className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 dark:text-blue-400 px-4 py-2 rounded-lg font-bold border border-gray-200 dark:border-gray-700 transition-colors shadow-sm">
              <BarChart2 size={20} /> 통계 보기
            </button>
          </Link>
          <Link href="/settings">
             <button className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 px-3 py-2 rounded-lg font-bold border border-gray-200 dark:border-gray-700 transition-colors shadow-sm" title="설정">
               <Settings size={20} />
             </button>
          </Link>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white underline">로그아웃</button>
        </div>
      </div>

      {/* 학습 대시보드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* 학습량 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-bold mb-2">TODAY'S LEARNING</h3>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-5xl font-black text-gray-900 dark:text-white">{todayCount}</span>
            <span className="text-gray-500 dark:text-gray-400 mb-2">Cards</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${todayAccuracy}%` }}></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-right">정답률 <span className="text-blue-500 dark:text-blue-400 font-bold">{todayAccuracy}%</span></p>
        </div>

        {/* 스트릭 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="z-10">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-bold mb-1">CURRENT STREAK</h3>
            <div className="text-5xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              {streak} <span className="text-2xl text-gray-500">days</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{streak > 0 ? "꾸준함이 재능을 이깁니다! 🔥" : "오늘 공부를 시작해보세요!"}</p>
          </div>
          <div className={`absolute -right-6 -bottom-6 text-9xl transition-all duration-500 ${streak > 0 ? "text-orange-500/20 group-hover:text-orange-500/30" : "text-gray-200 dark:text-gray-700/20"}`}>🔥</div>
        </div>

        {/* 캘린더 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-bold mb-4 flex justify-between">
            <span>THIS MONTH</span><span>{new Date().getMonth() + 1}월</span>
          </h3>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
            <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              const today = new Date();
              const year = today.getFullYear();
              const month = today.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const calendarCells = [];
              for (let i = 0; i < firstDay; i++) calendarCells.push(<div key={`empty-${i}`}></div>);
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isAttended = attendedDates.has(dateStr);
                const isToday = d === today.getDate();
                calendarCells.push(
                  <div key={d} className={`aspect-square flex items-center justify-center rounded-full text-xs font-bold relative ${isToday ? "border border-blue-500 text-blue-500" : ""} ${isAttended ? "bg-blue-500 text-white" : "text-gray-400"}`}>{d}</div>
                );
              }
              return calendarCells;
            })()}
          </div>
        </div>
      </div>

      {/* 박스 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wrongNoteDeck && (
          <div className="relative group rounded-xl p-6 border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400">
                <BookOpen size={24} />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">{wrongNoteDeck.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10">{wrongNoteDeck.description}</p>
            <Link href={`/study/${wrongNoteDeck.id}`} className="block w-full mt-6">
              <button className="w-full py-2 rounded-lg font-bold text-sm bg-red-500 hover:bg-red-600 text-white transition-colors">
                오답 복습하기
              </button>
            </Link>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={draggableDecks.map(d => d.id)} strategy={rectSortingStrategy}>
            {draggableDecks.map((deck) => (
              <SortableDeckCard key={deck.id} deck={deck} activeMenuId={activeMenuId} setActiveMenuId={setActiveMenuId} deleteDeck={deleteDeck} />
            ))}
          </SortableContext>
        </DndContext>

        <button onClick={() => setIsModalOpen(true)} className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-400 hover:text-blue-500 hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all gap-4">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full">
            <Plus size={32} />
          </div>
          <span className="font-semibold">새 암기 박스 만들기</span>
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">새 박스 만들기</h2>
            <input className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded mb-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="박스 이름" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus />
            <textarea className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded mb-6 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" placeholder="설명" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">취소</button>
              <button onClick={createDeck} className="px-6 py-2 bg-blue-600 rounded font-bold text-white hover:bg-blue-500">생성하기</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
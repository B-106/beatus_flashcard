"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, RotateCcw, Plus, Layers, PlayCircle, BookOpen, AlertCircle } from "lucide-react";

type Card = {
  id: number;
  question: string;
  answer: string;
  box_level: number;
  correct_count?: number;
  incorrect_count?: number;
  is_wrong: boolean;
};

// ▼ 가중치 알고리즘 (기존 유지)
const calculateNextReview = (currentBox: number, isCorrect: boolean, wrongCount: number) => {
  if (!isCorrect) {
    return { nextBox: 1, nextDate: new Date().toISOString() };
  }
  const nextBox = Math.min(currentBox + 1, 6);
  const baseIntervals = [0, 10, 1440, 4320, 10080, 21600, 43200]; 
  let minutesToAdd = baseIntervals[nextBox] || 0;
  if (wrongCount > 10) minutesToAdd = minutesToAdd * 0.5;
  else if (wrongCount > 5) minutesToAdd = minutesToAdd * 0.7;
  const nextDateObj = new Date();
  nextDateObj.setMinutes(nextDateObj.getMinutes() + minutesToAdd);
  return { nextBox, nextDate: nextDateObj.toISOString() };
};

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  // 상태
  const [deckId, setDeckId] = useState<string>("");
  const [deckTitle, setDeckTitle] = useState("");
  const [isWrongNoteMode, setIsWrongNoteMode] = useState(false); // ★ 오답노트 모드인지 확인
  const [currentBox, setCurrentBox] = useState(1);
  
  const [cards, setCards] = useState<Card[]>([]);
  const [boxCounts, setBoxCounts] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  
  const [isStudying, setIsStudying] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  // 1. 초기 로드
  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setDeckId(resolvedParams.id);
      
      // 단어장 정보 가져오면서 오답노트인지 체크
      const { data: deck } = await supabase.from("decks").select("*").eq("id", resolvedParams.id).single();
      if (deck) {
        setDeckTitle(deck.title);
        setIsWrongNoteMode(deck.is_wrong_note); // ★ 오답노트 여부 설정

        // 오답노트면 -> 무조건 오답 카드 로드
        // 일반노트면 -> 1번 박스 로드
        if (deck.is_wrong_note) {
          loadWrongCards();
        } else {
          loadCardsForBox(resolvedParams.id, 1);
          fetchBoxCounts(resolvedParams.id);
        }
      }
    };
    unwrapParams();
  }, [params]);

  // ★ 2-A. 오답 카드만 싹 긁어오는 함수 (오답노트 전용)
  const loadWrongCards = async () => {
    setLoading(true);
    setIsStudying(false);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // 내 카드 중에서 is_wrong이 true인 것만 가져옴 (deck_id 상관없음!)
    const { data } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user?.id)
      .eq("is_wrong", true)
      .order("next_review_at", { ascending: true }); // 급한 순서

    setCards(data || []);
    setLoading(false);
  };

  // 2-B. 일반 박스 카드 불러오기
  const loadCardsForBox = async (id: string, boxLevel: number) => {
    setLoading(true);
    setIsStudying(false);
    const { data } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", id)
      .eq("box_level", boxLevel)
      .order("next_review_at", { ascending: true });
    setCards(data || []);
    setLoading(false);
  };

  const fetchBoxCounts = async (id: string) => {
    const counts = [0, 0, 0, 0, 0, 0];
    const { data } = await supabase.from("flashcards").select("box_level").eq("deck_id", id);
    if (data) {
      data.forEach((card: any) => {
        if (card.box_level >= 1 && card.box_level <= 6) counts[card.box_level - 1]++;
      });
    }
    setBoxCounts(counts);
  };

  const startStudy = () => {
    if (cards.length === 0) return alert("학습할 카드가 없습니다.");
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setIsStudying(true);
  };

  // 3. 정답/오답 처리 (로직 분기)
  const handleVote = async (isCorrect: boolean) => {
    const currentCard = cards[currentCardIndex];
    if (!currentCard) return;

    const currentWrongCount = (currentCard as any).incorrect_count || 0;
    const currentCorrectCount = (currentCard as any).correct_count || 0;

    let updateData: any = {};

    // ★ 오답노트 모드일 때의 처리 로직
    if (isWrongNoteMode) {
      if (isCorrect) {
        // 맞았으면 오답 딱지 떼기! (오답노트에서 탈출)
        // 박스 레벨은 유지하거나 1 올려줌 (여기선 유지)
        updateData = {
          is_wrong: false, // 탈출!
          correct_count: currentCorrectCount + 1,
          next_review_at: new Date().toISOString() // 일단 갱신
        };
      } else {
        // 또 틀렸으면? 오답 딱지 유지 + 카운트 증가
        updateData = {
          is_wrong: true,
          incorrect_count: currentWrongCount + 1,
          next_review_at: new Date().toISOString() // 즉시 복습
        };
      }
    } else {
      // ★ 일반 모드일 때의 처리 로직 (기존 알고리즘)
      const { nextBox, nextDate } = calculateNextReview(currentCard.box_level, isCorrect, currentWrongCount);
      updateData = {
        box_level: nextBox,
        next_review_at: nextDate,
        is_wrong: !isCorrect,
        correct_count: isCorrect ? currentCorrectCount + 1 : currentCorrectCount,
        incorrect_count: isCorrect ? currentWrongCount : currentWrongCount + 1
      };
    }

    // DB 업데이트 병렬 처리
    await Promise.all([
      supabase.from("flashcards").update(updateData).eq("id", currentCard.id),
      supabase.from("study_logs").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        is_correct: isCorrect,
      })
    ]);

    // 다음 카드
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      alert("학습 완료!");
      setIsStudying(false);
      // 끝나면 목록 새로고침
      if (isWrongNoteMode) loadWrongCards();
      else {
        loadCardsForBox(deckId, currentBox);
        fetchBoxCounts(deckId);
      }
    }
  };

  // 카드 추가 (일반 모드에서만 사용)
  const addCard = async () => {
    if (!newQ || !newA) return alert("내용을 입력하세요.");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("flashcards").insert({
      user_id: user.id,
      deck_id: Number(deckId),
      question: newQ,
      answer: newA,
      box_level: 1,
    });

    setNewQ("");
    setNewA("");
    alert("추가되었습니다!");
    setIsAddMode(false);
    fetchBoxCounts(deckId);
    if (currentBox === 1) loadCardsForBox(deckId, 1);
  };

  const currentCard = cards[currentCardIndex];
  const totalAttempts = currentCard ? (currentCard.correct_count || 0) + (currentCard.incorrect_count || 0) : 0;
  const accuracy = totalAttempts === 0 ? 0 : Math.round(((currentCard.correct_count || 0) / totalAttempts) * 100);

  let badgeColor = "bg-gray-700 text-gray-300"; // 기본 (새 카드)
  if (totalAttempts > 0) {
    if (accuracy >= 80) badgeColor = "bg-green-900/50 text-green-400 border border-green-500/30";
    else if (accuracy >= 50) badgeColor = "bg-yellow-900/50 text-yellow-400 border border-yellow-500/30";
    else badgeColor = "bg-red-900/50 text-red-400 border border-red-500/30";
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300 flex">
      <main className="flex-1 p-8 flex flex-col relative">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/")} className="p-2 hover:bg-gray-800 rounded-full">
            <ArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {deckTitle} 
              {/* 오답노트일 땐 박스 번호 표시 안 함 */}
              {!isWrongNoteMode && (
                <span className="text-gray-500 text-lg">
                  / {currentBox === 6 ? "Completed (완료)" : `Box ${currentBox}`}
                </span>
              )}
            </h1>
          </div>
        </div>

        {isStudying && cards.length > 0 ? (
          /* 학습 화면 */
          <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
            <div className="w-full mb-4 text-right text-gray-400">
              {currentCardIndex + 1} / {cards.length}
            </div>
            <div 
              onClick={() => setIsFlipped(true)}
              className={`cursor-pointer w-full h-96 bg-gray-800 rounded-2xl border border-gray-700 flex flex-col items-center justify-center p-10 text-center transition-all duration-300 ${isFlipped ? "border-blue-500 bg-gray-800" : "hover:border-gray-500"}`}
            >
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
                {totalAttempts === 0 ? "New ✨" : `정답률 ${accuracy}% (${totalAttempts}회 학습)`}
                </div>
              <div className="text-gray-400 text-sm mb-4">{isFlipped ? "Answer" : "Question"}</div>
              <h2 className="text-4xl font-bold break-keep">
                {isFlipped ? cards[currentCardIndex].answer : cards[currentCardIndex].question}
              </h2>
              {!isFlipped && <p className="mt-8 text-gray-500 text-sm animate-pulse">클릭해서 정답 확인</p>}
            </div>

            {isFlipped && (
              <div className="flex gap-4 mt-8 w-full">
                <button onClick={() => handleVote(false)} className="flex-1 bg-red-600 hover:bg-red-700 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2">
                  <RotateCcw /> 되돌리기
                </button>
                <button onClick={() => handleVote(true)} className="flex-1 bg-white text-black hover:bg-gray-200 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2">
                  <Check /> 정답!
                </button>
              </div>
            )}
            <button onClick={() => setIsStudying(false)} className="mt-6 text-gray-500 underline">학습 중단하기</button>
          </div>
        ) : (
          /* 대기 화면 */
          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            <div className="text-center">
              <div className={`inline-flex p-6 rounded-full mb-4 ${isWrongNoteMode ? "bg-red-900/30 text-red-500" : "bg-gray-800 text-blue-400"}`}>
                {isWrongNoteMode ? <AlertCircle size={48} /> : <BookOpen size={48} />}
              </div>
              <h2 className="text-3xl font-bold mb-2">
                {isWrongNoteMode ? "🚨 오답 집중 공략" : (currentBox === 6 ? "🎉 완료된 카드" : `Box ${currentBox}`)}
              </h2>
              <p className="text-gray-400">
                {isWrongNoteMode 
                  ? "틀렸던 카드들만 모아서 확실하게 복습하세요." 
                  : `현재 대기 중인 카드는 총 ${cards.length}장입니다.`}
              </p>
              {isWrongNoteMode && <p className="text-red-400 mt-2 font-bold">{cards.length}개의 오답이 남았습니다.</p>}
            </div>

            <div className="flex gap-4">
              {/* 카드 추가 버튼: 오답노트에서는 안 보임 */}
              {!isWrongNoteMode && currentBox === 1 && (
                <button onClick={() => setIsAddMode(true)} className="px-8 py-4 bg-gray-800 border border-gray-600 hover:bg-gray-700 rounded-xl font-bold flex items-center gap-2">
                  <Plus /> 단어 추가
                </button>
              )}
              
              <button 
                onClick={startStudy}
                disabled={cards.length === 0}
                className={`px-8 py-4 rounded-xl font-bold flex items-center gap-2 text-lg shadow-lg transition-all ${
                  cards.length === 0 ? "bg-gray-700 text-gray-500 cursor-not-allowed" 
                  : (isWrongNoteMode ? "bg-red-600 hover:bg-red-500 text-white" : "bg-blue-600 hover:bg-blue-500 text-white")
                }`}
              >
                <PlayCircle size={24} /> 
                {cards.length > 0 ? (isWrongNoteMode ? "오답 완전 정복 시작" : "카드 뽑기 (학습 시작)") : "카드 없음"}
              </button>
            </div>
          </div>
        )}

        {/* 카드 추가 모달 (기존 코드 유지) */}
        {isAddMode && (
           /* ... 모달 코드는 기존과 동일 ... */
           <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md border border-gray-700">
              <h3 className="text-xl font-bold mb-6">새 카드 만들기</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">문제 (Front)</label>
                  <input value={newQ} onChange={e => setNewQ(e.target.value)} className="w-full bg-gray-800 p-3 rounded text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ex: Apple" autoFocus />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">정답 (Back)</label>
                  <input value={newA} onChange={e => setNewA(e.target.value)} className="w-full bg-gray-800 p-3 rounded text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ex: 사과" />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setIsAddMode(false)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg">취소</button>
                <button onClick={addCard} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold">추가하기</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 우측 탭 (오답노트 모드일 땐 숨김) */}
      {!isWrongNoteMode && (
        <aside className="w-24 bg-gray-800 border-l border-gray-700 flex flex-col items-center py-8 gap-4">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              onClick={() => { setCurrentBox(num); loadCardsForBox(deckId, num); }}
              className={`w-16 h-20 rounded-lg flex flex-col items-center justify-center transition-all ${
                currentBox === num ? "bg-blue-600 text-white shadow-lg scale-110 z-10" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              <span className="text-xs font-bold mb-1">BOX</span>
              <span className="text-xl font-black">{num}</span>
              <span className="text-[10px] mt-1 bg-black/20 px-2 rounded-full">{boxCounts[num-1]}장</span>
            </button>
          ))}
          <button
            onClick={() => { setCurrentBox(6); loadCardsForBox(deckId, 6); }}
            className={`w-16 h-20 rounded-lg flex flex-col items-center justify-center transition-all mt-auto border ${
              currentBox === 6 ? "bg-green-600 text-white border-green-500 scale-110" : "bg-green-900/30 text-green-500 border-green-500/30"
            }`}
          >
            <Layers size={16} className="mb-1" />
            <span className="text-xs">완료</span>
            <span className="font-bold">{boxCounts[5]}</span>
          </button>
        </aside>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js"; // 유저 타입 가져오기

export default function Home() {
  const [user, setUser] = useState<User | null>(null); // 로그인한 유저 정보 담을 그릇
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");

  const addCard = async () => {
    if (!user) return;
    if (!q || !a) return alert("단어와 뜻을 모두 입력해주세요.");

    const { error } = await supabase
      .from("flashcards")
      .insert({
        user_id: user.id,
        question: q,
        answer: a,
      });

    if (error) {
      console.error(error);
      alert("저장 실패");
    } else {
      alert("단어장에 추가되었습니다!");
      setQ(""); // 입력창 비우기
      setA("");
    }
  };

  // 1. 앱 켜지면 로그인 상태 확인
  useEffect(() => {
    const checkUser = async () => {
      // 현재 로그인된 유저 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    checkUser();

    // 로그인/로그아웃 상태 변화 감지 (실시간)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. 구글 로그인 함수
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000", // 로그인 끝나면 돌아올 주소
      },
    });
  };

  // 3. 로그아웃 함수
  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert("로그아웃 되었습니다.");
  };

  if (loading) return <div className="p-10 text-white">로딩 중...</div>;

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      
      {/* 로그인 안 했을 때 보여줄 화면 */}
      {!user ? (
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-blue-400">My Own Flashcard</h1>
          <p className="text-gray-400">나만의 단어장을 만들어보세요.</p>
          <button
            onClick={handleGoogleLogin}
            className="bg-white text-gray-800 px-6 py-3 rounded-lg font-bold flex items-center gap-3 hover:bg-gray-100 transition"
          >
            {/* 구글 로고 아이콘 (SVG) */}
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24.81-.6z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            구글로 시작하기
          </button>
        </div>
      ) : (
        /* 로그인 했을 때 보여줄 화면 */
        <div className="w-full max-w-2xl">
          <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
            <div>
              <h2 className="text-xl font-bold">반갑습니다, {user.user_metadata.full_name || user.email}님!</h2>
              <p className="text-sm text-gray-400">Email: {user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-bold"
            >
              로그아웃
            </button>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-blue-300">📝 새 단어 추가</h3>
            <div className="flex flex-col gap-3">
              <input 
                className="p-3 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="단어 (Question) ex: Apple"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              <input 
                className="p-3 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="뜻 (Answer) ex: 사과"
                value={a}
                onChange={e => setA(e.target.value)}
              />
              <button 
                onClick={addCard}
                className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold text-white transition-colors mt-2"
              >
                추가하기
              </button>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg text-center border border-gray-700">
             <h3 className="text-2xl mb-2">📊 학습 대시보드 (준비중)</h3>
             <p className="text-gray-400">여기에 라이트너 박스 현황이 표시될 예정입니다.</p>
          </div>
        </div>
      )}
    </main>
  );
}
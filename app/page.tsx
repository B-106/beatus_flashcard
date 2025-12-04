"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: resData, error } = await supabase.from("var1").select("*");
        
        if (error) {
          console.error("Supabase Error:", error.message);
          alert("Data Load Error");
        } else {
          console.log("Fetched Data:", resData);
          setData(resData);
        }
      } catch (e) {
        console.error("Unknown Error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  async function submit() {
    if (!q || !a) return alert("질문과 답을 입력해주세요.");

    // API 라우트를 쓰지 않고 클라이언트에서 바로 넣을 수도 있습니다 (Supabase 장점)
    // 현재 작성하신 방식대로 API를 호출한다면 /api/cards가 구현되어 있어야 합니다.
    const response = await fetch("/api/cards", {
      method: "POST",
      body: JSON.stringify({ question: q, answer: a }),
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      alert("추가 완료! 새로고침하면 보입니다.");
      setQ("");
      setA("");
    } else {
      alert("저장 실패");
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-10 flex flex-col gap-6">
      <h1 className="text-3xl font-bold text-blue-400">Var1 DB 테스트</h1>
      
      {/* 데이터 표시 영역 */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h2 className="text-xl mb-2">현재 데이터:</h2>
        {loading ? (
          <p>로딩 중...</p>
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-green-300">
            {data && data.length > 0 ? JSON.stringify(data, null, 2) : "데이터가 없습니다 (빈 배열)."}
          </pre>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="flex flex-col gap-3 max-w-md">
        <input 
          className="p-3 rounded text-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
          placeholder="질문 (Question)"
        />
        <input 
          className="p-3 rounded text-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={a} 
          onChange={(e) => setA(e.target.value)} 
          placeholder="답 (Answer)"
        />
        <button 
          onClick={submit}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors"
        >
          카드 추가하기
        </button>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, Layers } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

export default function StatisticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // 차트 데이터
  const [trendData, setTrendData] = useState<any[]>([]);
  const [boxData, setBoxData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. 최근 7일간의 학습 로그 가져오기
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 오늘 포함 7일
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: logs } = await supabase
      .from("study_logs")
      .select("created_at, is_correct")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    // 2. 날짜별 정답률 가공 로직
    const statsByDate: Record<string, { total: number; correct: number }> = {};
    
    // 7일치 날짜 미리 채워두기 (데이터 없는 날도 0으로 표시하기 위해)
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0].slice(5); // "MM-DD" 형식
      statsByDate[dateStr] = { total: 0, correct: 0 };
    }

    // 로그 데이터 집계
    logs?.forEach(log => {
      const dateStr = log.created_at.split("T")[0].slice(5); // "MM-DD"
      if (statsByDate[dateStr]) {
        statsByDate[dateStr].total += 1;
        if (log.is_correct) statsByDate[dateStr].correct += 1;
      }
    });

    // 차트용 배열로 변환
    const formattedTrendData = Object.keys(statsByDate)
      .sort() // 날짜순 정렬
      .map(date => {
        const { total, correct } = statsByDate[date];
        const rate = total === 0 ? 0 : Math.round((correct / total) * 100);
        return { date, rate, total }; // total은 툴팁에 보여주기 위해
      });

    setTrendData(formattedTrendData);


    // 3. 현재 박스별 카드 분포 가져오기
    const { data: cards } = await supabase
      .from("flashcards")
      .select("box_level")
      .eq("user_id", user.id);

    const counts = [0, 0, 0, 0, 0, 0, 0]; // 0번 인덱스 안씀, 1~6번
    cards?.forEach((c: any) => {
      if (c.box_level >= 1 && c.box_level <= 6) counts[c.box_level]++;
    });

    // 바 차트용 데이터
    const formattedBoxData = [
      { name: "Box 1", count: counts[1], color: "#EF4444" }, // Red
      { name: "Box 2", count: counts[2], color: "#F97316" }, // Orange
      { name: "Box 3", count: counts[3], color: "#EAB308" }, // Yellow
      { name: "Box 4", count: counts[4], color: "#22C55E" }, // Green
      { name: "Box 5", count: counts[5], color: "#3B82F6" }, // Blue
      { name: "완료", count: counts[6], color: "#8B5CF6" }, // Purple
    ];

    setBoxData(formattedBoxData);
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => router.push("/")} className="p-2 hover:bg-gray-800 rounded-full">
          <ArrowLeft />
        </button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="text-blue-400" /> 학습 통계
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        
        {/* 1. 정답률 추이 (꺾은선 그래프) */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            📊 최근 7일 정답률 추이
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis unit="%" stroke="#9CA3AF" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1F2937", borderColor: "#374151", color: "#fff" }}
                  formatter={(value: any, name: any, props: any) => [
                    `${value}% (총 ${props.payload.total}문제)`, "정답률"
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#3B82F6" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: "#3B82F6" }} 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-gray-400 text-sm mt-4">
            * 최근 일주일간 학습한 기록을 바탕으로 계산됩니다.
          </p>
        </div>

        {/* 2. 박스별 카드 분포 (막대 그래프) */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Layers className="text-yellow-400" /> 박스별 카드 현황
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={boxData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis allowDecimals={false} stroke="#9CA3AF" />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: "#1F2937", borderColor: "#374151", color: "#fff" }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                  {boxData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-gray-400 text-sm mt-4">
            * 오른쪽으로 갈수록(완료) 암기가 잘 된 카드입니다.
          </p>
        </div>

      </div>
    </div>
  );
}
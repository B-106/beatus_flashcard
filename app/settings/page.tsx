"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useTheme } from "next-themes"; // 테마 훅
import { useRouter } from "next/navigation";
import { ArrowLeft, Moon, Sun, User as UserIcon, Calendar, Mail } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const { theme, setTheme } = useTheme(); // 테마 변경 함수
  const [mounted, setMounted] = useState(false); // 마운트 여부 확인

  useEffect(() => {
    setMounted(true); // 클라이언트 로드 완료
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // 가입일로부터 며칠 지났는지 계산
  const getStudyDays = () => {
    if (!user?.created_at) return 0;
    const joinDate = new Date(user.created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - joinDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  // 마운트 전에는 아무것도 안 보여줌 (테마 불일치 에러 방지)
  if (!mounted) return null;

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => router.push("/")} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft />
        </button>
        <h1 className="text-3xl font-bold">프로필 및 설정</h1>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* 1. 프로필 카드 */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center mb-6">
            {/* 프로필 사진 (구글 이미지 or 기본 아이콘) */}
            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-blue-500">
              {user?.user_metadata.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  <UserIcon size={40} className="text-gray-500" />
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold">{user?.user_metadata.full_name || "사용자"}</h2>
            <p className="text-gray-500 dark:text-gray-400">Flashcard Master</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-lg">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">이메일 계정</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-lg">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">학습 시작일</p>
                <p className="font-medium">
                  {new Date(user?.created_at || "").toLocaleDateString()} 
                  <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                    ({getStudyDays()}일차)
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 테마 설정 카드 */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold mb-6">앱 설정</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon className="text-purple-400" /> : <Sun className="text-orange-400" />}
              <div>
                <p className="font-medium">테마 설정</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {theme === "dark" ? "다크 모드 사용 중" : "라이트 모드 사용 중"}
                </p>
              </div>
            </div>

            {/* 테마 토글 버튼 */}
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setTheme("light")}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                  theme === "light" 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                  theme === "dark" 
                    ? "bg-gray-600 text-white shadow-sm" 
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Dark
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
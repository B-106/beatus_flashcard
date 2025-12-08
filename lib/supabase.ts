import { createClient } from "@supabase/supabase-js";

// 1. 환경 변수 가져오기
const supabaseUrl = "https://nsjlueyatqqlkejitlyh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zamx1ZXlhdHFxbGtlaml0bHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODQxNTQsImV4cCI6MjA4MDE2MDE1NH0.uBPvD0FGTOWcRuarcpmK9WlvyXJXQdmcXiI__4EPAhc";

// 2. 환경 변수가 잘 들어왔는지 검사 (이게 없으면 빨간 줄이 뜹니다)
if (!supabaseUrl || !supabaseKey) {
  // 개발자 도구 콘솔에 빨간 글씨로 경고를 띄웁니다.
  console.error("Supabase 환경 변수가 없습니다! .env.local 파일을 확인하세요.");
  
  // 강제로 에러를 발생시켜서 이유를 알립니다.
  throw new Error("Supabase URL 또는 Key가 비어있습니다.");
}

// 3. 검사가 통과되었으므로 안전하게 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey);
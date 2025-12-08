import { createClient } from "@supabase/supabase-js";

// 1. 환경 변수 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 2. 환경 변수가 잘 들어왔는지 검사 (이게 없으면 빨간 줄이 뜹니다)
if (!supabaseUrl || !supabaseKey) {
  // 개발자 도구 콘솔에 빨간 글씨로 경고를 띄웁니다.
  console.error("Supabase 환경 변수가 없습니다! .env.local 파일을 확인하세요.");
  
  // 강제로 에러를 발생시켜서 이유를 알립니다.
  throw new Error("Supabase URL 또는 Key가 비어있습니다.");
}

// 3. 검사가 통과되었으므로 안전하게 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey);
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data, error } = await supabase.from("var1").select("*");
  return (
    <main className="p-6 text-2xl">
      My Own Flashcard 홈 화면입니다.
      <div>
        <h1>Cards</h1>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </main>
  );
}
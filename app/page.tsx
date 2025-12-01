import Image from "next/image";
import { supabase } from "@/lib/supabase";
"use client";
import { useState } from "react";

export default async function Home() {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const { data, error } = await supabase.from("var1").select("*");
  async function submit() {
    const res = await fetch("/api/cards", {
      method: "POST",
      body: JSON.stringify({ question: q, answer: a }),
    });
    alert("ok");
  }
  return (
    <main className="p-6 text-2xl">
      My Own Flashcard 홈 화면입니다.
      <div>
        <h1>var1</h1>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
      <div>
      <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="질문"/>
      <input value={a} onChange={(e)=>setA(e.target.value)} placeholder="답"/>
      <button onClick={submit}>추가</button>
      </div>
    </main>
  );
}
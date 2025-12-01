"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");

  useEffect(() => {
    supabase.from("var1").select("*").then((res) => setData(res.data));
  }, []);

  async function submit() {
    await fetch("/api/cards", {
      method: "POST",
      body: JSON.stringify({ question: q, answer: a }),
    });
    alert("ok");
  }

  return (
    <main className="p-6 text-2xl">
      <h1>var1</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="질문" />
      <input value={a} onChange={(e) => setA(e.target.value)} placeholder="답" />
      <button onClick={submit}>추가</button>
    </main>
  );
}
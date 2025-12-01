import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();

  const { data, error } = await supabase
    .from("var1")
    .insert({
      question: body.question,
      answer: body.answer,
    })
    .select();

  return Response.json({ data, error });
}
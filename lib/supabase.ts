import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 없습니다.");
}

// 기존 프로젝트(Compañero/WWVS 등)와 같은 DB를 쓰되, robot_match 전용 스키마만 바라봅니다.
// Supabase 대시보드 > Project Settings > API > Data API settings > Exposed schemas
// 에 "robot_match" 를 추가해두지 않으면 아래 호출이 전부 실패합니다.
export const supabase = createClient<Database, "robot_match">(
  supabaseUrl ?? "",
  supabaseAnonKey ?? "",
  { db: { schema: "robot_match" } }
);

// 참고용 수동 작성 타입입니다. 실제 프로젝트에 적용한 뒤에는
//   supabase gen types typescript --project-id <id> --schema robot_match > lib/database.types.ts
// 로 자동 생성된 파일로 교체하는 걸 권장합니다.
//
// 주의 1: 아래 타입들은 모두 `interface`가 아닌 `type`으로 선언되어 있습니다.
// supabase-js 의 GenericTable 제약(Row/Insert/Update extends Record<string, unknown>)이
// interface로 선언된 타입에 대해서는 구조적으로 만족하지 않는 것으로 평가되어
// from(...).insert(...) 등의 타입이 전부 never 로 무너지는 문제가 있었습니다.
//
// 주의 2: 최상위 키가 "public"이 아니라 "robot_match"입니다. 기존 프로젝트를
// 공유하면서 전용 스키마로 테이블을 격리했기 때문입니다 (lib/supabase.ts 참고).

export type FeatureLevel = "basic" | "standard" | "advanced";
export type VerificationStatus = "unverified" | "verified" | "outdated";

export type Category = {
  code: string;
  name_ko: string;
  name_en: string;
  description: string | null;
};

export type Robot = {
  id: string;
  name: string;
  manufacturer: string;
  category_code: string;
  category_sub: string | null;

  price_krw_min: number | null;
  price_krw_max: number | null;
  monthly_cost_krw: number;

  rental_available: boolean;
  rental_regions: string[];

  feature_level: FeatureLevel;
  conversation_level: number; // 0~5
  difficulty_level: number;   // 1~5

  safety_certified: boolean;
  as_network_score: number;   // 1~5
  noise_level: number;        // 1~5
  privacy_data_local: boolean;

  release_date: string | null;
  discontinued: boolean;

  verification_status: VerificationStatus;
  last_verified: string | null;
  source_url: string | null;

  created_at: string;
  updated_at: string;
};

export type UserSession = {
  id: string;
  answers: Record<string, unknown>;
  recommended_robot_ids: string[];
  created_at: string;
};

export type Feedback = {
  id: string;
  session_id: string | null;
  purchased: boolean | null;
  satisfaction_score: number | null;
  comment: string | null;
  created_at: string;
};

export type RobotReport = {
  id: string;
  robot_id: string | null;
  report_type: "incorrect_info" | "discontinued" | "new_model" | "other";
  message: string;
  status: "pending" | "reviewed" | "applied" | "rejected";
  created_at: string;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: string };
  robot_match: {
    Tables: {
      categories: { Row: Category; Insert: Category; Update: Partial<Category>; Relationships: [] };
      robots: {
        Row: Robot;
        Insert: Omit<Robot, "id" | "created_at" | "updated_at">;
        Update: Partial<Robot>;
        Relationships: [];
      };
      user_sessions: {
        Row: UserSession;
        Insert: Omit<UserSession, "id" | "created_at">;
        Update: Partial<UserSession>;
        Relationships: [];
      };
      feedback: {
        Row: Feedback;
        Insert: Omit<Feedback, "id" | "created_at">;
        Update: Partial<Feedback>;
        Relationships: [];
      };
      robot_reports: {
        Row: RobotReport;
        Insert: Omit<RobotReport, "id" | "created_at" | "status">;
        Update: Partial<RobotReport>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

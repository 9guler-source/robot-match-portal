// 기획서 4~5장(분기 로직 / 매칭 알고리즘)의 1차 구현체.
// RobotMatchSurvey.jsx 의 `answers` 상태와 1:1로 맞춘 타입입니다.

import type { Robot } from "./database.types";

export interface SurveyAnswers {
  household: string;
  housing: string;
  pet: string;
  internet: string;
  purposes: string[]; // 선택 순서 = 우선순위 (0번째가 1순위)
  purposeMode: "" | "allinone" | "separate";
  digital: string; // "입문" | "중급" | "숙련"
  careTarget: { who: string; mobility: string; cognition: string; medication: string };
  usageTime: string;
  usagePattern: string;
  featureLevels: Record<string, "basic" | "standard" | "advanced">;
  interaction: number; // 1~5 (낮을수록 작업중심, 높을수록 대화중심)
  voice: boolean;
  budget: string;
  maintenance: string;
  purchase: string; // "일시불 구매" | "할부" | "렌탈" | "구독형(월정액)" | "리스(사업자용)"
  asImportance: string; // "매우 중요" | "보통" | "상관없음"
  partsSensitivity: string;
  remoteOk: string;
  installSpace: string;
  privacy: string; // "높음" | "보통" | "낮음"
  safetyCert: string; // "필요" | "불필요"
  noise: string;
}

export interface ScoredRobot {
  robot: Robot;
  score: number;
  reasons: string[];
  excluded?: string;
}

export interface MatchResult {
  mode: "single" | "allinone_candidates" | "combo_candidates";
  top: ScoredRobot[];
  byCategory: Record<string, ScoredRobot[]>;
}

const BUDGET_MAX_KRW: Record<string, number> = {
  "~50만원": 500_000,
  "50~150만원": 1_500_000,
  "150~500만원": 5_000_000,
  "500~2,000만원": 20_000_000,
  "2,000만원 이상": Infinity,
};

const FEATURE_RANK: Record<string, number> = { basic: 1, standard: 2, advanced: 3 };

function priorityWeight(idx: number): number {
  if (idx === 0) return 1.5;
  if (idx <= 2) return 1.0;
  return 0.7;
}

/** 로봇 1개에 대한 하드필터 + 가중합 스코어링 (기획서 4.1/4.2 규칙 반영) */
function scoreRobot(answers: SurveyAnswers, r: Robot): ScoredRobot {
  const reasons: string[] = [];
  const budgetMax = BUDGET_MAX_KRW[answers.budget] ?? Infinity;

  if (r.discontinued) {
    return { robot: r, score: -1, reasons, excluded: "단종 모델" };
  }
  const purposeIdx = answers.purposes.indexOf(r.category_code);
  if (purposeIdx === -1) {
    return { robot: r, score: -1, reasons, excluded: "목적 카테고리 불일치" };
  }
  // 하드필터: 안전인증
  if (answers.safetyCert === "필요" && !r.safety_certified) {
    return { robot: r, score: -1, reasons, excluded: "안전 인증 미달" };
  }
  // 하드필터: 예산 상한
  if (r.price_krw_min != null && r.price_krw_min > budgetMax) {
    return { robot: r, score: -1, reasons, excluded: "예산 상한 초과" };
  }
  // 하드필터: 렌탈 선호인데 미지원
  if (answers.purchase === "렌탈" && !r.rental_available) {
    return { robot: r, score: -1, reasons, excluded: "렌탈 미지원" };
  }

  let score = 10 * priorityWeight(purposeIdx);
  reasons.push(`${purposeIdx + 1}순위 목적(${r.category_code})과 일치`);

  const wantLevel = answers.featureLevels[r.category_code];
  if (wantLevel && FEATURE_RANK[r.feature_level] >= FEATURE_RANK[wantLevel]) {
    score += 5;
    reasons.push("요구 기능 수준 충족");
  }

  if (answers.interaction >= 4 && r.conversation_level >= 3) {
    score += 4;
    reasons.push("대화 중심 선호와 부합");
  }
  if (answers.interaction <= 2 && r.conversation_level <= 1) {
    score += 4;
    reasons.push("작업 중심 선호와 부합");
  }

  if (answers.asImportance === "매우 중요") {
    score += r.as_network_score;
    if (r.as_network_score >= 4) reasons.push("AS 네트워크가 우수함");
  }

  if (answers.purchase === "렌탈" && r.rental_available) {
    score += 3;
    reasons.push("렌탈 지원");
  }

  if (answers.digital === "입문" && r.difficulty_level <= 2) {
    score += 3;
    reasons.push("입문자도 쉽게 설정 가능");
  }

  if (answers.privacy === "높음" && r.privacy_data_local) {
    score += 3;
    reasons.push("온디바이스 처리로 프라이버시 보호");
  }

  if (answers.noise === "높음" && r.noise_level <= 2) {
    score += 2;
    reasons.push("저소음 설계");
  }

  // 동점 처리(tie-break): 검증완료 > AS점수 > 최신출시
  score += r.verification_status === "verified" ? 0.3 : 0;
  score += r.as_network_score * 0.01;
  if (r.release_date) score += new Date(r.release_date).getTime() * 1e-15;

  return { robot: r, score, reasons };
}

/**
 * 기획서 4.3 결과 분기 트리:
 *  - 목적 1개 → 카테고리 내 Top3
 *  - 목적 2개, 올인원 존재 → 올인원 Top2 + 전문조합 Top1 비교
 *  - 목적 2개, 올인원 부재 → 전문조합만
 *  - 목적 3개 이상 → 전문조합 우선(올인원은 참고용 하단)
 */
export function matchRobots(answers: SurveyAnswers, robots: Robot[]): MatchResult {
  const scored = robots.map((r) => scoreRobot(answers, r)).filter((s) => s.score >= 0);
  scored.sort((a, b) => b.score - a.score);

  const byCategory: Record<string, ScoredRobot[]> = {};
  for (const cat of answers.purposes) {
    byCategory[cat] = scored
      .filter((s) => s.robot.category_code === cat)
      .sort((a, b) => b.score - a.score);
  }

  if (answers.purposes.length === 1) {
    return { mode: "single", top: byCategory[answers.purposes[0]]?.slice(0, 3) ?? [], byCategory };
  }

  // 올인원 후보: 단일 로봇이 사용자가 고른 모든 목적 카테고리를 커버하지는 못하므로
  // (스키마상 robots.category_code는 1개) 현재는 "메인 목적 1순위 점수가 가장 높은 로봇"을
  // 올인원 후보로 잠정 표시. 실제로는 robot_categories 다대다 테이블 확장을 권장(기획서 6장 확장 여지).
  const allInOneCandidates = byCategory[answers.purposes[0]]?.slice(0, 2) ?? [];
  const comboTop = answers.purposes
    .map((cat) => byCategory[cat]?.[0])
    .filter((x): x is ScoredRobot => !!x);

  if (answers.purposes.length >= 3) {
    return { mode: "combo_candidates", top: comboTop, byCategory };
  }
  return {
    mode: answers.purposeMode === "allinone" ? "allinone_candidates" : "combo_candidates",
    top: answers.purposeMode === "allinone" ? allInOneCandidates : comboTop,
    byCategory,
  };
}

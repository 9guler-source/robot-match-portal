"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Sparkles, ChefHat, HeartPulse, MessageCircle, ShieldCheck,
  GraduationCap, Hammer, Gamepad2, Stethoscope, PawPrint,
  ChevronLeft, ChevronRight, RotateCcw, Star, AlertTriangle, BadgeCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { matchRobots, type SurveyAnswers, type MatchResult, type ScoredRobot } from "@/lib/matching";
import type { Robot } from "@/lib/database.types";

const CATS = [
  { id: "CLN", label: "청소", icon: Sparkles },
  { id: "KIT", label: "주방", icon: ChefHat },
  { id: "CARE", label: "개호/돌봄", icon: HeartPulse },
  { id: "MATE", label: "메이트", icon: MessageCircle },
  { id: "SEC", label: "경호/보안", icon: ShieldCheck },
  { id: "EDU", label: "교육", icon: GraduationCap },
  { id: "WORK", label: "작업", icon: Hammer },
  { id: "ENT", label: "엔터테인먼트", icon: Gamepad2 },
  { id: "MED", label: "의료보조", icon: Stethoscope },
  { id: "PET", label: "펫케어", icon: PawPrint },
] as const;

const FEATURE_LEVELS = [
  { id: "basic", label: "기본형", desc: "단일 기능만" },
  { id: "standard", label: "표준형", desc: "연동 기능 포함" },
  { id: "advanced", label: "고급형", desc: "AI 학습·개인화" },
] as const;

const emptyAnswers: SurveyAnswers = {
  household: "", housing: "", pet: "", internet: "",
  purposes: [], purposeMode: "",
  digital: "",
  careTarget: { who: "", mobility: "", cognition: "", medication: "" },
  usageTime: "", usagePattern: "",
  featureLevels: {},
  interaction: 3, voice: false,
  budget: "", maintenance: "",
  purchase: "",
  asImportance: "", partsSensitivity: "", remoteOk: "",
  installSpace: "", privacy: "", safetyCert: "", noise: "",
};

type StepId =
  | "env" | "purpose" | "purposeMode" | "digital" | "careTarget" | "usage"
  | "features" | "interaction" | "budget" | "purchase" | "support" | "constraints" | "result";

function Chip({ active, onClick, children, className = "" }: {
  active: boolean; onClick: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-xl border px-4 py-2.5 text-sm text-left transition-all " +
        (active
          ? "border-amber-400 bg-amber-400/10 text-amber-100"
          : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500") +
        " " + className
      }
    >
      {children}
    </button>
  );
}
function StepShell({ eyebrow, title, sub, children }: {
  eyebrow: string; title: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs tracking-widest text-amber-400/80 uppercase mb-1">{eyebrow}</p>
        <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
        {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      {children}
    </div>
  );
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}
function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2">{children}</div>;
}
function PathTracker({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-1.5 shrink-0">
          <div
            className={
              "h-2.5 w-2.5 rounded-full border transition-all " +
              (i < current ? "bg-amber-400 border-amber-400"
                : i === current ? "bg-amber-400 border-amber-400 ring-2 ring-amber-400/30 scale-125"
                : "bg-transparent border-slate-600")
            }
          />
          {i < total - 1 && <div className={"h-px w-3 " + (i < current ? "bg-amber-400/60" : "bg-slate-700")} />}
        </div>
      ))}
    </div>
  );
}

function set<K extends keyof SurveyAnswers>(
  setAnswers: React.Dispatch<React.SetStateAction<SurveyAnswers>>, k: K, v: SurveyAnswers[K]
) {
  setAnswers((prev) => ({ ...prev, [k]: v }));
}

function formatPrice(min: number | null, max: number | null) {
  if (min == null && max == null) return "가격 정보 없음(조사 필요)";
  const f = (n: number) => `₩${n.toLocaleString()}`;
  if (min === max) return f(min!);
  return `${f(min ?? 0)} ~ ${f(max ?? 0)}`;
}

function RobotCard({ sr }: { sr: ScoredRobot }) {
  const r = sr.robot;
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-slate-50">{r.name}</p>
          <p className="text-xs text-slate-400">{r.manufacturer} · {r.category_sub ?? r.category_code}</p>
        </div>
        {r.verification_status !== "verified" && (
          <span className="flex items-center gap-1 text-[11px] text-amber-300/90 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5 shrink-0">
            <AlertTriangle className="h-3 w-3" /> 정보 검증 필요
          </span>
        )}
      </div>
      <p className="text-sm text-slate-200">{formatPrice(r.price_krw_min, r.price_krw_max)}</p>
      <div className="flex flex-wrap gap-1.5">
        {r.rental_available && (
          <span className="text-[11px] text-cyan-300 bg-cyan-400/10 border border-cyan-400/30 rounded-full px-2 py-0.5">렌탈 가능</span>
        )}
        {r.safety_certified && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 rounded-full px-2 py-0.5">
            <BadgeCheck className="h-3 w-3" /> 안전인증
          </span>
        )}
      </div>
      {sr.reasons.length > 0 && (
        <ul className="text-xs text-slate-400 space-y-1 pt-1 border-t border-slate-800">
          {sr.reasons.map((reason, i) => (
            <li key={i} className="flex gap-1.5"><span className="text-amber-400">·</span>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const MODE_COPY: Record<MatchResult["mode"], string> = {
  single: "고르신 목적에 가장 잘 맞는 로봇이에요",
  allinone_candidates: "한 대로 여러 목적을 커버할 후보예요 (완전한 다목적 로봇은 아직 시장에 드물어요)",
  combo_candidates: "목적별로 가장 잘하는 전문 로봇을 조합으로 추천드려요",
};

function ResultStep({
  loading, error, result, onRestart,
}: { loading: boolean; error: string | null; result: MatchResult | null; onRestart: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-amber-400">
        <Star className="h-5 w-5 fill-amber-400" />
        <p className="text-xs tracking-widest uppercase">여정 완료</p>
      </div>
      <h2 className="text-xl font-semibold text-slate-50">
        {loading ? "어울리는 로봇을 찾는 중이에요" : "이런 로봇은 어떠세요"}
      </h2>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-slate-800 bg-slate-900/40 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-400/5 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && result && result.top.length === 0 && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300 space-y-2">
          <p className="font-medium text-slate-100">지금 조건에 딱 맞는 로봇을 DB에서 찾지 못했어요.</p>
          <p className="text-slate-400">아직 데이터가 부족한 카테고리이거나, 예산·렌탈 조건이 까다로울 수 있어요. 조건을 조금 넓혀서 다시 시도해보시겠어요?</p>
        </div>
      )}

      {!loading && !error && result && result.top.length > 0 && (
        <>
          <p className="text-sm text-slate-400">{MODE_COPY[result.mode]}</p>
          <div className="space-y-3">
            {result.top.map((sr) => <RobotCard key={sr.robot.id} sr={sr} />)}
          </div>
        </>
      )}

      <button
        onClick={onRestart}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-amber-300 transition-colors"
      >
        <RotateCcw className="h-4 w-4" /> 처음부터 다시
      </button>
    </div>
  );
}

// ---- Step 0~10 입력 컴포넌트 ----
function EnvStep({ a, setA }: { a: SurveyAnswers; setA: React.Dispatch<React.SetStateAction<SurveyAnswers>> }) {
  return (
    <StepShell eyebrow="여정의 시작" title="어떤 환경에서 함께할까요" sub="로봇이 머물 공간을 알려주세요">
      <Field label="가구 형태">
        <Grid2>{["1인", "부부", "자녀동반가족", "다세대(노부모동거)", "1인사업장"].map((v) => (
          <Chip key={v} active={a.household === v} onClick={() => set(setA, "household", v)}>{v}</Chip>
        ))}</Grid2>
      </Field>
      <Field label="주거 형태">
        <Grid2>{["아파트", "단독주택", "상가·사무실"].map((v) => (
          <Chip key={v} active={a.housing === v} onClick={() => set(setA, "housing", v)}>{v}</Chip>
        ))}</Grid2>
      </Field>
      <Field label="반려동물">
        <Grid2>{["있음", "없음"].map((v) => (
          <Chip key={v} active={a.pet === v} onClick={() => set(setA, "pet", v)}>{v}</Chip>
        ))}</Grid2>
      </Field>
      <Field label="인터넷 환경">
        <Grid2>{["안정적", "불안정"].map((v) => (
          <Chip key={v} active={a.internet === v} onClick={() => set(setA, "internet", v)}>{v}</Chip>
        ))}</Grid2>
      </Field>
    </StepShell>
  );
}
function PurposeStep({ a, setA }: { a: SurveyAnswers; setA: React.Dispatch<React.SetStateAction<SurveyAnswers>> }) {
  const toggle = (id: string) => {
    const cur = a.purposes;
    set(setA, "purposes", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };
  return (
    <StepShell eyebrow="목적" title="어떤 용도로 쓰실 건가요" sub="여러 개 고를 수 있어요. 고른 순서가 우선순위가 됩니다">
      <div className="grid grid-cols-2 gap-2.5">
        {CATS.map((c) => {
          const idx = a.purposes.indexOf(c.id);
          const Icon = c.icon;
          return (
            <button key={c.id} onClick={() => toggle(c.id)}
              className={"relative rounded-2xl border p-3.5 flex flex-col items-start gap-2 transition-all " +
                (idx > -1 ? "border-amber-400 bg-amber-400/10" : "border-slate-700 bg-slate-900/60 hover:border-slate-500")}>
              {idx > -1 && idx < 3 && (
                <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center justify-center">{idx + 1}</span>
              )}
              <Icon className={"h-5 w-5 " + (idx > -1 ? "text-amber-300" : "text-slate-400")} />
              <span className={"text-sm font-medium " + (idx > -1 ? "text-amber-100" : "text-slate-300")}>{c.label}</span>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}
function PurposeModeStep({ a, setA }: { a: SurveyAnswers; setA: React.Dispatch<React.SetStateAction<SurveyAnswers>> }) {
  return (
    <StepShell eyebrow="범위 확인" title="한 대가 다 하길 원하세요?" sub={`${a.purposes.length}가지 목적을 고르셨네요`}>
      <div className="space-y-2.5">
        <Chip active={a.purposeMode === "allinone"} onClick={() => set(setA, "purposeMode", "allinone")} className="block w-full">
          <span className="font-medium">올인원 로봇 1대</span>
          <span className="block text-xs text-slate-400 mt-0.5">기능은 줄더라도 한 대로 해결</span>
        </Chip>
        <Chip active={a.purposeMode === "separate"} onClick={() => set(setA, "purposeMode", "separate")} className="block w-full">
          <span className="font-medium">전문 로봇 여러 대</span>
          <span className="block text-xs text-slate-400 mt-0.5">목적별로 가장 잘하는 로봇 조합</span>
        </Chip>
      </div>
    </StepShell>
  );
}
function DigitalStep({ a, setA }: { a: SurveyAnswers; setA: React.Dispatch<React.SetStateAction<SurveyAnswers>> }) {
  const opts = [{ v: "입문", d: "스마트폰 기본 기능만 사용" }, { v: "중급", d: "앱 설치·설정 정도는 가능" }, { v: "숙련", d: "자동화·연동 설정을 선호" }];
  return (
    <StepShell eyebrow="디지털 활용도" title="기기를 다루는 데 익숙하신가요">
      <div className="space-y-2.5">
        {opts.map((o) => (
          <Chip key={o.v} active={a.digital === o.v} onClick={() => set(setA, "digital", o.v)} className="block w-full">
            <span className="font-medium">{o.v}</span>
            <span className="block text-xs text-slate-400 mt-0.5">{o.d}</span>
          </Chip>
        ))}
      </div>
    </StepShell>
  );
}
function CareTargetStep({ a, setA }: { a: SurveyAnswers; setA: React.Dispatch<React.SetStateAction<SurveyAnswers>> }) {
  const upd = (k: keyof SurveyAnswers["careTarget"], v: string) => set(setA, "careTarget", { ...a.careTarget, [k]: v });
  return (
    <StepShell eyebrow="돌봄 정보" title="누구를 위한 돌봄인가요" sub="민감한 정보는 언제든 '답변 안 함'을 선택하셔도 괜찮아요">
      <Field label="대상"><Grid2>{["본인", "배우자", "부모님", "자녀"].map((v) => (
        <Chip key={v} active={a.careTarget.who === v} onClick={() => upd("who", v)}>{v}</Chip>))}</Grid2></Field>
      <Field label="이동성"><Grid2>{["자립보행", "보조기 사용", "와상", "답변 안 함"].map((v) => (
        <Chip key={v} active={a.careTarget.mobility === v} onClick={() => upd("mobility", v)}>{v}</Chip>))}</Grid2></Field>
      <Field label="인지 상태"><Grid2>{["정상", "경미한 저하", "진단됨", "답변 안 함"].map((v) => (
        <Chip key={v} active={a.careTarget.cognition === v} onClick={() => upd("cognition", v)}>{v}</Chip>))}</Grid2></Field>
      <Field label="복약 관리 필요"><Grid2>{["필요", "불필요"].map((v) => (
        <Chip key={v} active={a.careTarget.medication === v} onClick={() => upd("medication", v)}>{v}</Chip>))}</Grid2></Field>
    </StepShell>
  );
}
function UsageStep({ a, setA }: { a: SurveyAnswers; setA: React.Dispatch<React.SetStateAction<SurveyAnswers>> }) {
  return (
    <StepShell eyebrow="사용 패턴" title="하루에 얼마나, 어떻게 쓰실 건가요">
      <Field label="하루 사용 시간"><Grid2>{["1시간 미만", "1~3시간", "거의 상시"].map((v) => (
        <Chip key={v} active={a.usageTime === v} onClick={() => set(setA, "usageTime", v)}>{v}</Chip>))}</Grid2></Field>
      <Field label="사용 패턴"><Grid2>{["특정 시간대 집중", "분산", "돌발상황 대응형"].map((v) => (
        <Chip key={v} active={a.usagePattern === v} onClick={() => set(setA, "usagePattern", v)}>{v}</Chip>))}</Grid2></Field>
    </StepShell>
  );
}
function FeaturesStep({ a, setA }: { a: SurveyAnswers; setA: React.Dispatch<React.SetStateAction<SurveyAnswers>> }) {
  const upd = (cat: string, lvl: "basic" | "standard" | "advanced") =>
    set(setA, "featureLevels", { ...a.featureLevels, [cat]: lvl });
  return (
    <StepShell eyebrow="기능 수준" title="목적별로 어느 정도 기능이 필요하세요">
      <div className="space-y-5">
        {a.purposes.map((catId) => {
          const cat = CATS.find((c) => c.id === catId)!;
          const Icon = cat.icon;
          return (
            <div key={catId}>
              <p className="text-sm text-slate-300 mb-2 flex items-center gap-1.5"><Icon className="h-4 w-4 text-amber-400" /> {cat.label}</p>
              <Grid3>{FEATURE_LEVELS.map((f) => (
                <Chip key={f.id} active={a.featureLevels[catId] === f.id} onClick={() => upd(catId, f.id)}>
                  <span className="block">{f.label}</span>
                  <span className="block text-[11px] text-slate-500">{f.desc}</span>
                </Chip>
              ))}</Grid3>
            </div>
          );
        })}
      </div>
    </StepShell>
  );
}
function InteractionStep({ a, setA }: { a: SurveyAnswers; setA: React.Dispatch<React.SetStateAction<SurveyAnswers>> }) {
  return (
    <StepShell eyebrow="상호작용" title="대화 상대일까요, 일꾼일까요">
      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
        <input type="range" min={1} max={5} value={a.interaction}
          onChange={(e) => set(setA, "interaction", Number(e.target.value))} className="w-full accent-amber-400" />
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>일만 시키면 됨</span><span>대화 상대가 되어줬으면</span>
        </div>
      </div>
      <label className="flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900/60 p-3.5 text-sm text-slate-300">
        <input type="checkbox" checked={a.voice} onChange={(e) => set(setA, "voice", e.target.checked)} className="accent-amber-400 h-4 w-4" />
        음성 대화 / 다국어 지원이 필요해요
      </label>
    </StepShell>
  );
}
function BudgetStep({ a, setA }: { a: SurveyAnswers; setA: React.Dispatch<React.SetStateAction<SurveyAnswers>> }) {
  return (
    <StepShell eyebrow="예산" title="구매·유지 비용은 어느 정도로 생각하세요">
      <Field label="구매 가능 금액대">
        <div className="space-y-2">{["~50만원", "50~150만원", "150~500만원", "500~2,000만원", "2,000만원 이상"].map((v) => (
          <Chip key={v} active={a.budget === v} onClick={() => set(setA, "budget", v)} className="block w-full">{v}</Chip>))}</div>
      </Field>
      <Field label="월 유지비 허용 범위"><Grid2>{["~1만원", "1~5만원", "5만원 이상"].map((v) => (
        <Chip key={v} active={a.maintenance === v} onClick={() => set(setA, "maintenance", v)}>{v}</Chip>))}</Grid2></Field>
    </StepShell>
  );
}
function PurchaseStep({ a, setA }: { a: SurveyAnswers; setA: React.Dispatch<React.SetStateAction<SurveyAnswers>> }) {
  return (
    <StepShell eyebrow="구매 방식" title="어떻게 들이고 싶으세요">
      <div className="space-y-2">{["일시불 구매", "할부", "렌탈", "구독형(월정액)", "리스(사업자용)"].map((v) => (
        <Chip key={v} active={a.purchase === v} onClick={() => set(setA, "purchase", v)} className="block w-full">{v}</Chip>))}</div>
    </StepShell>
  );
}
function SupportStep({ a, setA }: { a: SurveyAnswers; setA: React.Dispatch<React.SetStateAction<SurveyAnswers>> }) {
  return (
    <StepShell eyebrow="AS / 지원" title="문제가 생겼을 때 어떤 지원이 필요하세요">
      <Field label="방문 수리 중요도"><Grid3>{["매우 중요", "보통", "상관없음"].map((v) => (
        <Chip key={v} active={a.asImportance === v} onClick={() => set(setA, "asImportance", v)}>{v}</Chip>))}</Grid3></Field>
      <Field label="단종·부품 조달 우려"><Grid2>{["민감함", "크게 신경 안 씀"].map((v) => (
        <Chip key={v} active={a.partsSensitivity === v} onClick={() => set(setA, "partsSensitivity", v)}>{v}</Chip>))}</Grid2></Field>
      <Field label="원격 지원(앱·콜센터)으로 충분한가요"><Grid2>{["충분함", "방문이 필요함"].map((v) => (
        <Chip key={v} active={a.remoteOk === v} onClick={() => set(setA, "remoteOk", v)}>{v}</Chip>))}</Grid2></Field>
    </StepShell>
  );
}
function ConstraintsStep({ a, setA }: { a: SurveyAnswers; setA: React.Dispatch<React.SetStateAction<SurveyAnswers>> }) {
  return (
    <StepShell eyebrow="마지막 확인" title="몇 가지만 더 확인할게요">
      <Field label="설치 공간 크기"><Grid3>{["좁음", "보통", "넉넉함"].map((v) => (
        <Chip key={v} active={a.installSpace === v} onClick={() => set(setA, "installSpace", v)}>{v}</Chip>))}</Grid3></Field>
      <Field label="카메라·마이크 상시 작동에 대한 민감도"><Grid3>{["높음", "보통", "낮음"].map((v) => (
        <Chip key={v} active={a.privacy === v} onClick={() => set(setA, "privacy", v)}>{v}</Chip>))}</Grid3></Field>
      <Field label="안전 인증 필요 여부"><Grid2>{["필요", "불필요"].map((v) => (
        <Chip key={v} active={a.safetyCert === v} onClick={() => set(setA, "safetyCert", v)}>{v}</Chip>))}</Grid2></Field>
      <Field label="소음 민감도"><Grid3>{["높음", "보통", "낮음"].map((v) => (
        <Chip key={v} active={a.noise === v} onClick={() => set(setA, "noise", v)}>{v}</Chip>))}</Grid3></Field>
    </StepShell>
  );
}

export default function MatchPage() {
  const [answers, setAnswers] = useState<SurveyAnswers>(emptyAnswers);
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = useMemo<StepId[]>(() => {
    const s: StepId[] = ["env", "purpose"];
    if (answers.purposes.length >= 3) s.push("purposeMode");
    s.push("digital");
    if (answers.purposes.some((p) => ["CARE", "EDU", "MED"].includes(p))) s.push("careTarget");
    s.push("usage", "features", "interaction", "budget", "purchase", "support", "constraints", "result");
    return s;
  }, [answers.purposes]);

  const idx = Math.min(stepIdx, steps.length - 1);
  const stepId = steps[idx];

  useEffect(() => {
    if (stepId !== "result") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: qErr } = await supabase.from("robots").select("*");
      if (cancelled) return;
      if (qErr) {
        setError("로봇 데이터를 불러오지 못했어요. Supabase 연결 설정(.env.local)을 확인해주세요.");
        setLoading(false);
        return;
      }
      const matched = matchRobots(answers, (data ?? []) as Robot[]);
      setResult(matched);
      setLoading(false);
      supabase
        .from("user_sessions")
        .insert({ answers: answers as unknown as Record<string, unknown>, recommended_robot_ids: matched.top.map((s) => s.robot.id) })
        .then(() => {});
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  const isValid = (): boolean => {
    switch (stepId) {
      case "env": return !!(answers.household && answers.housing && answers.pet && answers.internet);
      case "purpose": return answers.purposes.length >= 1;
      case "purposeMode": return !!answers.purposeMode;
      case "digital": return !!answers.digital;
      case "careTarget": return !!answers.careTarget.who;
      case "usage": return !!(answers.usageTime && answers.usagePattern);
      case "features": return answers.purposes.every((p) => !!answers.featureLevels[p]);
      case "budget": return !!(answers.budget && answers.maintenance);
      case "purchase": return !!answers.purchase;
      case "support": return !!(answers.asImportance && answers.partsSensitivity && answers.remoteOk);
      case "constraints": return !!(answers.installSpace && answers.privacy && answers.safetyCert && answers.noise);
      default: return true;
    }
  };

  const restart = () => { setAnswers(emptyAnswers); setStepIdx(0); setResult(null); setError(null); };

  const props = { a: answers, setA: setAnswers };
  const renderStep = () => {
    switch (stepId) {
      case "env": return <EnvStep {...props} />;
      case "purpose": return <PurposeStep {...props} />;
      case "purposeMode": return <PurposeModeStep {...props} />;
      case "digital": return <DigitalStep {...props} />;
      case "careTarget": return <CareTargetStep {...props} />;
      case "usage": return <UsageStep {...props} />;
      case "features": return <FeaturesStep {...props} />;
      case "interaction": return <InteractionStep {...props} />;
      case "budget": return <BudgetStep {...props} />;
      case "purchase": return <PurchaseStep {...props} />;
      case "support": return <SupportStep {...props} />;
      case "constraints": return <ConstraintsStep {...props} />;
      case "result": return <ResultStep loading={loading} error={error} result={result} onRestart={restart} />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col">
      <div className="flex flex-col flex-1 max-w-md mx-auto w-full px-5 pt-6 pb-5">
        {stepId !== "result" && <div className="mb-6"><PathTracker total={steps.length - 1} current={idx} /></div>}
        <div className="flex-1">{renderStep()}</div>
        {stepId !== "result" && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
            <button onClick={() => setStepIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
              className="flex items-center gap-1 text-sm text-slate-400 disabled:opacity-30 hover:text-slate-200 transition-colors">
              <ChevronLeft className="h-4 w-4" /> 이전
            </button>
            <button onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))} disabled={!isValid()}
              className="flex items-center gap-1 rounded-full bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 text-sm font-medium px-4 py-2 transition-colors">
              {idx === steps.length - 2 ? "결과 보기" : "다음"} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

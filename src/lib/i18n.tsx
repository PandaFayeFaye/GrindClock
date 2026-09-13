import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "zh" | "en";

const LANG_KEY = "gigtime_lang";

const dict = {
  home: { zh: "首页", en: "Home" },
  stats: { zh: "统计", en: "Stats" },
  settings: { zh: "我的", en: "Me" },

  homeBanner: { zh: "今天也要加油搬砖", en: "Let's earn today" },
  comboBadge: { zh: "双开中！{n}份工作同时计时", en: "{n} jobs running at once!" },
  todayEarned: { zh: "今日已赚", en: "Earned today" },
  todayWorked: { zh: "今日已工作 {h} 小时", en: "Worked {h}h today" },
  clockIn: { zh: "上班打卡", en: "Clock in" },
  clockOut: { zh: "下班打卡", en: "Clock out" },
  noEmployersHint: { zh: "还没有雇主？点击下方开始你的搬砖之旅", en: "No employers yet? Add your first one below" },
  addFirstEmployer: { zh: "+ 添加第一个雇主", en: "+ Add first employer" },
  aiCapture: { zh: "AI记工（拍照/语音）", en: "AI capture (photo/voice)" },
  backfill: { zh: "补录工时", en: "Backfill hours" },
  addEmployer: { zh: "添加雇主", en: "Add employer" },
  retroClockIn: { zh: "忘记打卡了？补录开始时间", en: "Forgot to clock in? Backfill the start time" },
  retroTitle: { zh: "补打「{name}」的上班卡", en: "Backfill clock-in for \"{name}\"" },
  retroSub: { zh: "实际是什么时候开始上班的？打卡会从这个时间点开始计时", en: "When did you actually start? The timer will count from this time" },
  cancel: { zh: "取消", en: "Cancel" },
  retroConfirm: { zh: "确认，开始计时", en: "Confirm, start timer" },

  settingsTitle: { zh: "我的", en: "Settings" },
  viewBadges: { zh: "查看成就徽章墙", en: "View badge wall" },
  groupInsights: { zh: "数据洞察", en: "Insights" },
  netPay: { zh: "净收益对比", en: "Net pay compare" },
  monthlyRecap: { zh: "本月战绩总结", en: "Monthly recap" },
  groupTeam: { zh: "团队", en: "Team" },
  teamNav: { zh: "团队代记工时（组长模式）", en: "Team time logging (lead mode)" },
  groupAccount: { zh: "账户", en: "Account" },
  userId: { zh: "用户ID：{id}…", en: "User ID: {id}…" },
  logout: { zh: "退出登录", en: "Log out" },
  groupPunch: { zh: "打卡设置", en: "Punch settings" },
  locationPunchTitle: { zh: "记录打卡地点", en: "Record clock-in location" },
  locationPunchSub: {
    zh: "开启后，上班打卡时会记录当时的地理位置（仅记录，不做地理围栏强制校验）",
    en: "When on, clock-in records your location (recorded only, no geofence enforcement)",
  },
  dailyRecapTitle: { zh: "每日小结推送", en: "Daily recap push" },
  dailyRecapSub: {
    zh: "下班后30-60分钟推送今日战绩（推送后端暂未接入，这里先存偏好）",
    en: "Push a summary 30-60min after clock-out (backend not wired up yet, preference only)",
  },
  groupFun: { zh: "趣味设置", en: "Fun settings" },
  simpleModeTitle: { zh: "简洁模式", en: "Simple mode" },
  simpleModeSub: { zh: "关闭吉祥物/称号横幅，首页只留打卡列表", en: "Hide mascot/banner, keep only the punch list" },
  languageTitle: { zh: "语言 / Language", en: "语言 / Language" },
  languageSub: { zh: "切换App显示语言", en: "Switch the app's display language" },
  pushTodo: {
    zh: "每日小结推送需要付费的Firebase云函数才能真正定时发送，本项目坚持0成本方案，暂不接入——上面的开关目前只是存偏好。",
    en: "Daily push needs paid Firebase Cloud Functions to actually fire on schedule; this project stays 0-cost, so it's not wired up yet -- the toggle above only stores a preference.",
  },

  statsTitle: { zh: "统计", en: "Stats" },
  rangeToday: { zh: "今日", en: "Today" },
  rangeWeek: { zh: "本周", en: "Week" },
  rangeMonth: { zh: "本月", en: "Month" },
  rangeAll: { zh: "全部", en: "All" },
  cumulativeHours: { zh: "累计总工时", en: "Total hours" },
  cumulativePay: { zh: "累计总收入", en: "Total earned" },
  periodHours: { zh: "本时段工时", en: "Hours this period" },
  periodPay: { zh: "本时段收入", en: "Earned this period" },
  moodStripTitle: { zh: "本周心情曲线（仅自己可见）", en: "This week's mood (only you can see this)" },
  vizTrend: { zh: "趋势", en: "Trend" },
  vizCalendar: { zh: "日历", en: "Calendar" },
  vizRank: { zh: "排行", en: "Rank" },
  trendTitle: { zh: "近7天收入趋势", en: "Last 7 days" },
  payCalendarTitle: { zh: "{month} 活跃度日历（颜色越深赚得越多）", en: "{month} activity (darker = more earned)" },
  streakCalendarTitle: { zh: "{month} 连续打卡日历（有没有打卡，不看赚多少）", en: "{month} streak calendar (punched or not, not how much)" },
  streakDays: { zh: "连续打卡 {n} 天", en: "{n}-day streak" },
  weeklyGoalTitle: { zh: "本周目标进度", en: "Weekly goal" },
  weeklyGoalPct: { zh: "本周目标", en: "of goal" },
  goalLabel: { zh: "目标", en: "Goal" },
  earnedLabel: { zh: "已赚", en: "earned" },
  tapToEditGoal: { zh: "（点击改目标）", en: " (tap to edit)" },
  leaderboardTitle: { zh: "本周雇主排行榜", en: "This week's leaderboard" },
  leaderboardEmpty: { zh: "这周还没有工时记录", en: "No hours logged this week yet" },
  recapTeaserT1: { zh: "查看本月打工战绩", en: "See this month's recap" },
  recapTeaserT2: { zh: "点击生成本月总结 →", en: "Tap to generate →" },
  detailListTitle: { zh: "明细", en: "Details" },
  exportCsv: { zh: "导出CSV", en: "Export CSV" },
  detailEmpty: { zh: "打完第一次卡，这里就会出现你的战绩", en: "Punch in once and your record shows up here" },
} as const;

export type DictKey = keyof typeof dict;

function readLang(): Lang {
  try {
    const raw = window.localStorage.getItem(LANG_KEY);
    return raw === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "zh",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => readLang());

  useEffect(() => {
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

export function useT() {
  const { lang } = useLang();
  return (key: DictKey, vars?: Record<string, string | number>) => {
    let text: string = dict[key][lang];
    if (vars) {
      for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v));
    }
    return text;
  };
}

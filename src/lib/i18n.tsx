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

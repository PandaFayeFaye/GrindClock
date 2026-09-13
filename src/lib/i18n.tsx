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
  groupAiFeatures: { zh: "AI功能", en: "AI features" },
  aiPhotoTitle: { zh: "拍照识别", en: "Photo capture" },
  aiPhotoSub: { zh: "首页“+”菜单里的“AI记工”会显示拍照识别选项", en: "Shows the photo option under Home's \"+\" > AI capture menu" },
  aiVoiceTitle: { zh: "语音记工", en: "Voice capture" },
  aiVoiceSub: { zh: "首页“+”菜单里的“AI记工”会显示语音记工选项", en: "Shows the voice option under Home's \"+\" > AI capture menu" },
  groupData: { zh: "数据", en: "Data" },
  exportAllData: { zh: "导出全部数据（CSV）", en: "Export all data (CSV)" },
  exporting: { zh: "导出中...", en: "Exporting..." },
  syncStatus: {
    zh: "云同步状态：已连接（数据实时同步到 Firebase，登录同一账号即可在其他设备看到）",
    en: "Cloud sync: Connected (data syncs live to Firebase -- sign in with the same account on another device to see it there)",
  },

  // ---- Punch confirm modal ----
  moodCrash: { zh: "崩溃", en: "Crash" },
  moodNormal: { zh: "普通", en: "OK" },
  moodGreat: { zh: "爽", en: "Great" },
  moodHeartbeat: { zh: "心动", en: "Heartbeat" },
  thisShift: { zh: "本次工时", en: "this shift" },
  hoursUnit: { zh: "{h}小时", en: "{h}h" },
  estimatedPay: { zh: "预估收入", en: "Est. pay" },
  recurringAdjApplied: { zh: "已自动套用{n}条该雇主的默认补贴/扣款规则", en: "{n} recurring rule(s) for this employer applied automatically" },
  howManyOrders: { zh: "完成了几单？", en: "How many orders?" },
  orderCountPlaceholder: { zh: "单数", en: "Order count" },
  howAreYouFeeling: { zh: "今天感觉怎么样？", en: "How are you feeling?" },
  optionalSkip: { zh: "（可跳过）", en: " (optional)" },
  moodNotePlaceholder: { zh: "想补一句吗？（最多20字，可跳过）", en: "Add a note? (up to 20 chars, optional)" },
  overtimeHolidayQ: { zh: "这次算加班/节假日吗？", en: "Overtime or holiday this time?" },
  affectsRateNote: { zh: "（影响倍率计算）", en: " (affects the rate multiplier)" },
  overtime: { zh: "加班", en: "Overtime" },
  holiday: { zh: "节假日", en: "Holiday" },
  oneTimeAdjustment: { zh: "本次补贴/扣款", en: "One-time bonus/deduction" },
  optionalOnce: { zh: "（可选，一次性）", en: " (optional, one-time)" },
  none: { zh: "无", en: "None" },
  bonus: { zh: "补贴", en: "Bonus" },
  deduction: { zh: "扣款", en: "Deduction" },
  amountPlaceholder: { zh: "金额（元）", en: "Amount" },
  noteLabel: { zh: "备注", en: "Note" },
  optional: { zh: "（可选）", en: " (optional)" },
  notePlaceholder: { zh: "今天发生了什么值得记一笔的事吗", en: "Anything worth noting about today?" },
  confirmSave: { zh: "确认保存", en: "Confirm & save" },

  // ---- Backfill / edit entry form ----
  backfillTitle: { zh: "补录工时", en: "Backfill hours" },
  editEntryTitle: { zh: "编辑工时记录", en: "Edit entry" },
  logForTitle: { zh: "为{name}记工时", en: "Log for {name}" },
  save: { zh: "保存", en: "Save" },
  employerLabel: { zh: "雇主", en: "Employer" },
  noEmployersOption: { zh: "还没有雇主", en: "No employers yet" },
  dateLabel: { zh: "日期", en: "Date" },
  entryModeLabel: { zh: "记录方式", en: "Entry mode" },
  modeDuration: { zh: "直接填时长", en: "Enter duration" },
  modeRange: { zh: "填上下班时间点", en: "Enter start/end time" },
  durationLabel: { zh: "工时时长", en: "Duration" },
  hoursPlaceholder: { zh: "小时", en: "Hours" },
  minutesPlaceholder: { zh: "分钟", en: "Minutes" },
  hoursSuffix: { zh: "小时", en: "h" },
  minutesSuffix: { zh: "分钟", en: "min" },
  startEndLabel: { zh: "上下班时间点", en: "Start / end time" },
  overtimeRateToggle: { zh: "按加班倍率计算", en: "Apply overtime rate" },
  holidayRateToggle: { zh: "按节假日倍率计算", en: "Apply holiday rate" },
  orderCountLabel: { zh: "完成单数", en: "Order count" },
  adjustmentsLabel: { zh: "补贴/扣款", en: "Bonus/deduction" },
  adjustmentsWithDefaultsSub: { zh: "（可选，含该雇主的默认规则）", en: " (optional, includes this employer's default rules)" },
  adjNotePlaceholder: { zh: "备注", en: "Note" },
  addOneRule: { zh: "+ 添加一条", en: "+ Add one" },
  deleteEntry: { zh: "删除这条记录", en: "Delete this entry" },

  // ---- Employer form ----
  addEmployerTitle: { zh: "添加雇主", en: "Add employer" },
  editEmployerTitle: { zh: "编辑雇主", en: "Edit employer" },
  employerNameLabel: { zh: "雇主名称", en: "Employer name" },
  employerNamePlaceholder: { zh: "比如：楼下奶茶店", en: "e.g. the bubble tea shop downstairs" },
  duplicateNameWarning: { zh: "已有同名雇主「{name}」，再次点击保存即确认要重复添加", en: "An employer named \"{name}\" already exists -- tap Save again to add a duplicate anyway" },
  colorLabel: { zh: "颜色标签", en: "Color" },
  settlementModeLabel: { zh: "结算模式", en: "Pay type" },
  payTypeHourly: { zh: "时薪", en: "Hourly" },
  payTypeDaily: { zh: "日结", en: "Daily" },
  payTypeBaseOvertime: { zh: "底薪+加班", en: "Base + OT" },
  payTypeComprehensive: { zh: "综合工时", en: "Comprehensive" },
  payTypeMonthly: { zh: "月结", en: "Monthly" },
  payTypePerOrder: { zh: "按单计费", en: "Per order" },
  currencyLabel: { zh: "币种", en: "Currency" },
  baseSalaryLabel: { zh: "底薪（月）", en: "Base salary (monthly)" },
  baseSalaryPlaceholder: { zh: "{sym} 每月固定拿到手的底薪", en: "{sym} fixed monthly base pay" },
  rateLabelHourly: { zh: "基础时薪", en: "Base hourly rate" },
  rateLabelOvertime: { zh: "加班时薪", en: "Overtime hourly rate" },
  rateLabelDaily: { zh: "日结金额", en: "Daily rate" },
  rateLabelMonthly: { zh: "月薪", en: "Monthly salary" },
  rateLabelPerOrder: { zh: "每单价格", en: "Price per order" },
  overtimeMultiplierLabel: { zh: "加班费率倍数", en: "Overtime rate multiplier" },
  holidayMultiplierLabel: { zh: "节假日费率倍数", en: "Holiday rate multiplier" },
  breakLabel: { zh: "休息扣除时长", en: "Unpaid break" },
  breakNone: { zh: "不扣除", en: "None" },
  breakMinutesFmt: { zh: "{m}分钟", en: "{m} min" },
  settlementCycleLabel: { zh: "结算周期", en: "Settlement cycle" },
  cycleDaily: { zh: "日结", en: "Daily" },
  cycleWeekly: { zh: "周结", en: "Weekly" },
  cycleMonthly: { zh: "月结", en: "Monthly" },
  netPaySettingsLabel: { zh: "净收益对比设置（可选）", en: "Net pay compare settings (optional)" },
  commuteMinutesPlaceholder: { zh: "预估通勤时长（分钟）", en: "Estimated commute time (minutes)" },
  commuteCostPlaceholder: { zh: "预估通勤交通费（元）", en: "Estimated commute cost" },
  idleTimePlaceholder: { zh: "预估等待/摸鱼时间占比（%，如接单间隙）", en: "Estimated idle/waiting time (%, e.g. between orders)" },
  defaultAdjLabel: { zh: "默认补贴/扣款规则", en: "Recurring bonus/deduction rules" },
  defaultAdjSub: { zh: "（可选，会自动套用到每一条新记录）", en: " (optional, auto-applied to every new entry)" },
  defaultAdjNotePlaceholder: { zh: "备注（如：夜班补贴）", en: "Note (e.g. night shift bonus)" },
  amountLabel: { zh: "金额", en: "Amount" },
  addRuleBtn: { zh: "+ 添加一条规则", en: "+ Add a rule" },
  employerNoteLabel: { zh: "备注", en: "Note" },
  employerNotePlaceholder: { zh: "工种、联系方式之类都可以写这里", en: "Job type, contact info, whatever's useful" },
  savedSplashTitle: { zh: "新雇主「{name}」入职啦！", en: "\"{name}\" has joined!" },
  savedSplashSub: { zh: "现在可以去打第一次卡了", en: "Time for your first clock-in" },
  multiplierSuffix: { zh: "{v}倍", en: "{v}x" },
  loading: { zh: "加载中...", en: "Loading..." },

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

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { watchTimeEntries } from "../lib/firestore";
import { entryHours } from "../lib/pay";
import { currentStreak, dateKey } from "../lib/stats";
import type { TimeEntry } from "../lib/types";
import "./BadgeWallPage.css";

const TIERS = [
  { name: "萌新打工人", threshold: 0 },
  { name: "摸鱼练习生", threshold: 10 },
  { name: "搬砖能手", threshold: 50 },
  { name: "卷王候选人", threshold: 200 },
  { name: "牛马之王", threshold: 500 },
];

interface Badge {
  name: string;
  cond: string;
  unlocked: boolean;
}

export function BadgeWallPage({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  useEffect(() => watchTimeEntries(uid, setEntries), [uid]);

  const personalConfirmed = useMemo(
    () => entries.filter((e) => !e.workerId && e.status === "confirmed" && e.endTime),
    [entries],
  );
  const totalHours = personalConfirmed.reduce((s, e) => s + entryHours(e), 0);

  const currentTierIdx = TIERS.reduce((idx, t, i) => (totalHours >= t.threshold ? i : idx), 0);
  const currentTier = TIERS[currentTierIdx];
  const nextTier = TIERS[currentTierIdx + 1];
  const progressPct = nextTier
    ? Math.min(100, Math.round(((totalHours - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100))
    : 100;

  const tierBadges: Badge[] = TIERS.map((t) => ({
    name: t.name,
    cond: t.threshold === 0 ? "0小时" : `满${t.threshold}小时`,
    unlocked: totalHours >= t.threshold,
  }));

  const hasComboDay = useMemo(() => {
    const byDay = new Map<string, Set<string>>();
    for (const e of personalConfirmed) {
      const key = dateKey(e.startTime);
      const set = byDay.get(key) ?? new Set<string>();
      set.add(e.employerId);
      byDay.set(key, set);
    }
    return [...byDay.values()].some((set) => set.size >= 2);
  }, [personalConfirmed]);

  const nightShiftCount = personalConfirmed.filter((e) => new Date(e.startTime).getHours() >= 22).length;
  const streak = currentStreak(personalConfirmed);

  const funBadges: Badge[] = [
    { name: "双开达人", cond: "同一天内为2个及以上雇主打卡", unlocked: hasComboDay },
    { name: "不灭火苗", cond: "连续打卡满30天", unlocked: streak >= 30 },
    { name: "深夜战士", cond: "完成10次22点后打卡", unlocked: nightShiftCount >= 10 },
    { name: "省钱达人", cond: "连续3周达成收入目标（需先在统计页设置目标）", unlocked: false },
  ];

  const [selected, setSelected] = useState<Badge | null>(null);

  return (
    <div className="badge-page">
      <div className="topbar">
        <button className="back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M15 5l-7 7 7 7" stroke="#1A1A1A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1>成就徽章墙</h1>
      </div>

      <div className="body">
        <div className="hero">
          <p className="hero-title">{currentTier.name}</p>
          <div className="hero-track"><div className="hero-fill" style={{ width: `${progressPct}%` }} /></div>
          <p className="hero-note">
            {nextTier ? `距离「${nextTier.name}」还差${(nextTier.threshold - totalHours).toFixed(0)}小时` : "已经是最高称号啦"}
          </p>
        </div>

        <div>
          <p className="section-label">称号进阶</p>
          <div className="badge-grid">
            {tierBadges.map((b) => (
              <div className={`badge${b.unlocked ? " unlocked" : " locked"}`} key={b.name} onClick={() => setSelected(b)}>
                <div className="badge-ic">
                  {b.unlocked ? (
                    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                      <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6z" fill="#1A1A1A" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                      <rect x="6" y="10" width="12" height="9" rx="1.5" stroke="#B9AC9C" strokeWidth="1.8" />
                      <path d="M8.5 10V7a3.5 3.5 0 017 0v3" stroke="#B9AC9C" strokeWidth="1.8" />
                    </svg>
                  )}
                </div>
                <span className="badge-name">{b.name}</span>
                <span className="badge-cond">{b.cond}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="section-label">隐藏成就</p>
          <div className="badge-grid">
            {funBadges.map((b) => (
              <div className={`badge${b.unlocked ? " unlocked" : " locked"}`} key={b.name} onClick={() => setSelected(b)}>
                <div className="badge-ic">
                  {b.unlocked ? (
                    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                      <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6z" fill="#1A1A1A" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                      <rect x="6" y="10" width="12" height="9" rx="1.5" stroke="#B9AC9C" strokeWidth="1.8" />
                      <path d="M8.5 10V7a3.5 3.5 0 017 0v3" stroke="#B9AC9C" strokeWidth="1.8" />
                    </svg>
                  )}
                </div>
                <span className="badge-name">{b.name}</span>
                <span className="badge-cond">{b.cond}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="backdrop" onClick={() => setSelected(null)}>
          <div className="detail-card" onClick={(e) => e.stopPropagation()}>
            <p className="detail-name">{selected.name}</p>
            <span className={`detail-status ${selected.unlocked ? "on" : "off"}`}>
              {selected.unlocked ? "已解锁" : "未解锁"}
            </span>
            <p className="detail-cond">解锁条件：{selected.cond}</p>
            <button className="detail-close" onClick={() => setSelected(null)}>知道了</button>
          </div>
        </div>
      )}
    </div>
  );
}

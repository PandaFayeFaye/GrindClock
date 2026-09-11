import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { completeEmailLoginLink, isEmailLoginLink, logout, watchAuth } from "./lib/auth";
import {
  addEmployer,
  clockIn,
  clockOut,
  watchEmployers,
  watchTimeEntries,
} from "./lib/firestore";
import type { Employer, TimeEntry } from "./lib/types";
import { LoginScreen } from "./components/LoginScreen";
import "./App.css";

const EMPLOYER_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];

function formatHours(ms: number) {
  return (ms / 3600000).toFixed(2);
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [newEmployerName, setNewEmployerName] = useState("");
  const [newEmployerRate, setNewEmployerRate] = useState("");

  useEffect(() => watchAuth((u) => { setUser(u); setAuthReady(true); }), []);

  // Finish an email magic-link sign-in if the app was opened via that link.
  useEffect(() => {
    const href = window.location.href;
    if (isEmailLoginLink(href)) {
      completeEmailLoginLink(href).catch((err) => console.error("Email link sign-in failed", err));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubEmployers = watchEmployers(user.uid, setEmployers);
    const unsubEntries = watchTimeEntries(user.uid, setEntries);
    return () => { unsubEmployers(); unsubEntries(); };
  }, [user]);

  // Multiple employers can be clocked in at once (gig workers commonly "dual-app"
  // across platforms) — only clocking into the *same* employer twice is blocked.
  const activeEntries = entries.filter((e) => e.endTime === null);
  const activeEntryByEmployer = new Map(activeEntries.map((e) => [e.employerId, e]));

  const summaryByEmployer = useMemo(() => {
    const map = new Map<string, { hours: number; pay: number }>();
    for (const e of entries) {
      if (!e.endTime) continue;
      const employer = employers.find((emp) => emp.id === e.employerId);
      if (!employer) continue;
      const hours = (e.endTime - e.startTime) / 3600000;
      const prev = map.get(employer.id) ?? { hours: 0, pay: 0 };
      map.set(employer.id, {
        hours: prev.hours + hours,
        pay: prev.pay + hours * employer.hourlyRate,
      });
    }
    return map;
  }, [entries, employers]);

  const totalPay = [...summaryByEmployer.values()].reduce((sum, v) => sum + v.pay, 0);

  if (!authReady) return <p className="loading">加载中...</p>;

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="app">
      <header>
        <h1>GigTime</h1>
        <button className="link" onClick={logout}>退出登录</button>
      </header>

      <section className="card">
        <h2>雇主 / 工作</h2>
        <ul className="employer-list">
          {employers.map((emp) => {
            const active = activeEntryByEmployer.get(emp.id);
            return (
            <li key={emp.id} style={{ borderLeftColor: emp.color }}>
              <span>{emp.name}（¥{emp.hourlyRate}/小时）</span>
              {active ? (
                <button onClick={() => clockOut(user.uid, active.id)}>下班打卡</button>
              ) : (
                <button onClick={() => clockIn(user.uid, emp.id)}>
                  上班打卡
                </button>
              )}
            </li>
            );
          })}
        </ul>
        <form
          className="add-employer"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newEmployerName || !newEmployerRate) return;
            addEmployer(user.uid, {
              name: newEmployerName,
              hourlyRate: Number(newEmployerRate),
              payType: "hourly",
              color: EMPLOYER_COLORS[employers.length % EMPLOYER_COLORS.length],
            });
            setNewEmployerName("");
            setNewEmployerRate("");
          }}
        >
          <input placeholder="雇主名称" value={newEmployerName} onChange={(e) => setNewEmployerName(e.target.value)} />
          <input placeholder="时薪" type="number" value={newEmployerRate} onChange={(e) => setNewEmployerRate(e.target.value)} />
          <button type="submit">添加雇主</button>
        </form>
      </section>

      <section className="card">
        <h2>合并统计（跨所有雇主）</h2>
        <p className="total">总收入：¥{totalPay.toFixed(2)}</p>
        <table>
          <thead>
            <tr><th>雇主</th><th>累计工时</th><th>累计收入</th></tr>
          </thead>
          <tbody>
            {employers.map((emp) => {
              const s = summaryByEmployer.get(emp.id) ?? { hours: 0, pay: 0 };
              return (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td>{formatHours(s.hours * 3600000)} h</td>
                  <td>¥{s.pay.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default App;

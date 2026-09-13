export interface RecapShareData {
  monthLabel: string;
  totalHours: number;
  totalPayText: string;
  employerCount: number;
  streak: number;
  topEmployer: string;
  hardestDay: string;
  heatCells: number[]; // 0-3 intensity, one per day of the month
  lang: "zh" | "en";
}

const HEAT_COLORS = ["#2A2A2A", "rgba(255,217,61,.45)", "rgba(255,217,61,.75)", "#FFD93D"];

/** Draws the recap poster onto an offscreen canvas and returns it as a PNG blob. */
export async function renderRecapShareImage(data: RecapShareData): Promise<Blob> {
  const W = 1080;
  const H = 1600;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(0, 0, W, H);

  // dot pattern background
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let y = 40; y < H; y += 40) {
    for (let x = 40; x < W; x += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const en = data.lang === "en";
  ctx.fillStyle = "#FFD93D";
  ctx.font = "700 32px system-ui, -apple-system, sans-serif";
  ctx.fillText(en ? `${data.monthLabel} · Work Recap` : `${data.monthLabel} · 打工战绩报告`, 64, 140);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 64px system-ui, -apple-system, sans-serif";
  wrapText(ctx, en ? `You put in ${data.totalHours.toFixed(0)} hours this month` : `这个月，你搬了${data.totalHours.toFixed(0)}小时的砖`, 64, 230, W - 128, 76);

  const tiles = [
    { n: data.totalPayText, l: en ? `Across ${data.employerCount} employer(s)` : `跨${data.employerCount}个雇主合计` },
    { n: en ? `${data.streak}d` : `${data.streak}天`, l: en ? "Current streak" : "当前打工火苗" },
    { n: data.topEmployer, l: en ? "Top earner" : "最赚钱雇主" },
    { n: data.hardestDay, l: en ? "Notable day" : "值得记住的一天" },
  ];

  const gridTop = 470;
  const cellW = (W - 64 * 2 - 24) / 2;
  const cellH = 180;
  tiles.forEach((tile, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 64 + col * (cellW + 24);
    const y = gridTop + row * (cellH + 24);
    ctx.fillStyle = "#242424";
    roundRect(ctx, x, y, cellW, cellH, 20);
    ctx.fill();
    ctx.fillStyle = "#FFD93D";
    ctx.font = "800 40px system-ui, -apple-system, sans-serif";
    fitText(ctx, tile.n, x + 28, y + 90, cellW - 56);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(tile.l, x + 28, y + 130);
  });

  const heatTop = gridTop + 2 * (cellH + 24) + 60;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "600 24px system-ui, -apple-system, sans-serif";
  ctx.fillText(en ? "This month's activity" : "本月活跃度", 64, heatTop);

  const cols = 7;
  const gap = 8;
  const cellSize = (W - 128 - gap * (cols - 1)) / cols;
  data.heatCells.forEach((level, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 64 + col * (cellSize + gap);
    const y = heatTop + 30 + row * (cellSize + gap);
    ctx.fillStyle = HEAT_COLORS[level];
    roundRect(ctx, x, y, cellSize, cellSize, 6);
    ctx.fill();
  });

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "500 22px system-ui, -apple-system, sans-serif";
  ctx.fillText(en ? "GrindClock · your multi-job sidekick" : "牛马打卡机 · 打工人的记工搭子", 64, H - 60);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas export failed"))), "image/png");
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  let line = "";
  let cy = y;
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = ch;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, cy);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  let size = 40;
  const family = "system-ui, -apple-system, sans-serif";
  ctx.font = `800 ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 20) {
    size -= 2;
    ctx.font = `800 ${size}px ${family}`;
  }
  ctx.fillText(text, x, y);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

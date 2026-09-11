# GigTime — 多雇主工时与收入记录

技术栈：React + TypeScript + Vite + Capacitor（iOS/Android）+ Firebase（Auth + Firestore）

## 已搭好的部分

- Web端可跑的多雇主打卡 + 合并统计 Demo（`src/App.tsx`）
- Firebase Auth（Google登录）+ Firestore 数据层（`src/lib/`）
- Capacitor 已初始化，`ios/` 和 `android/` 原生工程已生成
- 预装的原生插件：camera（拍照识别用）、geolocation（定位打卡用）、preferences（本地存储）

## 你需要做的配置

### 1. 创建 Firebase 项目（免费 Spark 方案）
1. 打开 https://console.firebase.google.com 创建项目
2. 添加一个 Web 应用，拿到 `firebaseConfig`，填入 `src/lib/firebase.ts`
3. 在 Firebase 控制台启用 Authentication → Google 登录方式
4. 启用 Firestore Database（生产模式），后续需要写安全规则（见下）

### 2. Firestore 安全规则（务必配置，否则任何人可读写）
在 Firebase 控制台 Firestore → 规则，改成：
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

### 3. 本地开发
```bash
npm run dev        # 启动网页版开发服务器
npm run build       # 构建产物到 dist/
npx cap sync         # 把最新 web 构建同步进 ios/ 和 android/ 原生工程
```

### 4. 跑安卓
需要 **Java 17**（当前系统检测到 Java 11，Android Gradle Plugin 要求 17，需要切换或安装 Java 17，例如 `brew install openjdk@17` 后设置 `JAVA_HOME`）。
```bash
npx cap open android   # 用 Android Studio 打开
```

### 5. 跑 iOS
```bash
npx cap open ios        # 用 Xcode 打开，真机调试需要 Apple 开发者账号（免费账号可用于模拟器/自己设备调试，上架需要付费账号 $99/年）
```

## 下一步开发建议（对应 PRD 优先级）

- [ ] 补充打卡时的地理围栏校验（`@capacitor/geolocation`，仅工作时段生效，需在UI上明确告知用户）
- [ ] 接入 Tesseract.js 做排班表/账单截图 OCR 识别
- [ ] 接入 Web Speech API 做语音记工
- [ ] 接入 Gemini API 免费层做文本结构化解析、异常检测
- [ ] 报表导出（Excel/PDF），走 P0 免费能力，不要锁付费墙
- [ ] 团队代记工时（组长/包工头批量记录）

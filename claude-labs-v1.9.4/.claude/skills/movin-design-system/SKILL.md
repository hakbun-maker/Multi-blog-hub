---
name: movin-design-system
description: 다크모드 + 네온 강조색 + 프리미엄 테크 무드의 디자인 시스템. Gemini MCP 연동.
trigger: frontend-specialist가 MOVIN 프로젝트 UI 구현 시 자동 적용
---

# MOVIN Design System Skill

> 다크모드 + 네온 강조색 + 프리미엄 테크 무드의 디자인 시스템

---

## 개요

MOVIN3D 웹사이트에서 영감을 받은 **프리미엄 테크 브랜드** 디자인 시스템입니다.
이 스킬은 frontend-specialist가 UI를 구현할 때 자동으로 적용됩니다.

### 디자인 철학

```
┌─────────────────────────────────────────────────────────┐
│  MOVIN Design Philosophy                                 │
│                                                          │
│  🌙 Dark Mode First    - 어두운 배경으로 고급스러움 연출 │
│  💚 Neon Accent        - 네온 그린/옐로우로 활력 표현   │
│  ✨ Premium Tech Mood  - AI/테크 브랜드 감성            │
│  🎬 Motion & Animation - 부드러운 전환과 인터랙션       │
│  📱 Responsive First   - 모바일부터 데스크톱까지        │
└─────────────────────────────────────────────────────────┘
```

---

## Gemini MCP 연동

이 스킬은 **Gemini MCP**와 연동되어 실제 컴포넌트 코드를 생성합니다.

### 자동 호출 조건

frontend-specialist가 다음 작업 수행 시 자동 적용:

1. **UI 컴포넌트 생성** - 버튼, 카드, 네비게이션 등
2. **페이지 레이아웃** - 히어로 섹션, 푸터, 사이드바 등
3. **스타일링 작업** - Tailwind CSS 클래스 생성

### Gemini 호출 예시

```typescript
// frontend-specialist가 컴포넌트 생성 시:
mcp__gemini__gemini_design_component({
  description: "다크모드 히어로 섹션 with 네온 CTA 버튼",
  framework: "React",
  styling: "Tailwind CSS"
})
```

---

## 색상 시스템 (Design Tokens)

### Primary Colors

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--bg-primary` | `#0a0a0a` | 메인 배경 |
| `--bg-secondary` | `#141414` | 카드/섹션 배경 |
| `--bg-tertiary` | `#1a1a1a` | 호버 상태 배경 |

### Accent Colors

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--accent-neon` | `#c8ff00` | 주요 CTA, 강조 |
| `--accent-green` | `#00ff88` | 성공 상태 |
| `--accent-blue` | `#00d4ff` | 링크, 정보 |

### Text Colors

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--text-primary` | `#ffffff` | 헤딩, 중요 텍스트 |
| `--text-secondary` | `rgba(255,255,255,0.7)` | 본문 |
| `--text-muted` | `rgba(255,255,255,0.4)` | 보조 텍스트 |

### Tailwind 설정

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0a0a',
        'bg-secondary': '#141414',
        'bg-tertiary': '#1a1a1a',
        'accent-neon': '#c8ff00',
        'accent-green': '#00ff88',
        'accent-blue': '#00d4ff',
      },
      fontFamily: {
        sans: ['Inter', 'Pretendard', 'sans-serif'],
      },
    },
  },
}
```

---

## 타이포그래피

### Font Stack

```css
--font-heading: 'Inter', 'Pretendard', sans-serif;
--font-body: 'Inter', 'Pretendard', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Scale

| 레벨 | 크기 | 무게 | 용도 |
|------|------|------|------|
| Display | 72px / 4.5rem | 700 | 히어로 타이틀 |
| H1 | 48px / 3rem | 700 | 페이지 제목 |
| H2 | 36px / 2.25rem | 600 | 섹션 제목 |
| H3 | 24px / 1.5rem | 600 | 서브섹션 |
| Body | 16px / 1rem | 400 | 본문 |
| Small | 14px / 0.875rem | 400 | 캡션 |

### Tailwind 클래스

```jsx
// 히어로 타이틀
<h1 className="text-5xl md:text-7xl font-bold tracking-tight">
  MOTION IS YOUR NEXT AI
</h1>

// 섹션 제목
<h2 className="text-3xl md:text-4xl font-semibold">
  Simpler, yet Smarter
</h2>

// 본문
<p className="text-base text-white/70 leading-relaxed">
  Create professional-grade human motion...
</p>
```

---

## 컴포넌트 스타일 가이드

### 1. 버튼 (Buttons)

```jsx
// Primary CTA - 네온 강조
<button className="
  bg-accent-neon text-black
  px-6 py-3 rounded-full
  font-semibold text-sm
  hover:bg-accent-neon/90
  transition-all duration-300
">
  Order Now
</button>

// Secondary - 아웃라인
<button className="
  border border-white/20 text-white
  px-6 py-3 rounded-full
  font-medium text-sm
  hover:bg-white/10
  transition-all duration-300
">
  Explore
</button>

// Ghost - 텍스트만
<button className="
  text-white/70
  hover:text-white
  font-medium text-sm
  transition-colors duration-200
">
  Learn More →
</button>
```

### 2. 카드 (Cards)

```jsx
<div className="
  bg-bg-secondary
  border border-white/10
  rounded-2xl
  p-6
  hover:border-white/20
  transition-all duration-300
">
  <h3 className="text-xl font-semibold text-white mb-2">
    Feature Title
  </h3>
  <p className="text-white/60">
    Feature description goes here...
  </p>
</div>
```

### 3. 네비게이션 (Navigation)

```jsx
<nav className="
  fixed top-0 w-full
  bg-black/80 backdrop-blur-md
  border-b border-white/10
  z-50
">
  <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <Logo />
    <div className="hidden md:flex items-center gap-8">
      <NavLink>Products</NavLink>
      <NavLink>About</NavLink>
      <NavLink>Contact</NavLink>
      <CTAButton>Get Started</CTAButton>
    </div>
  </div>
</nav>
```

### 4. 히어로 섹션 (Hero)

```jsx
<section className="
  min-h-screen
  bg-bg-primary
  flex items-center justify-center
  relative overflow-hidden
">
  {/* 배경 그라데이션 */}
  <div className="absolute inset-0 bg-gradient-to-b from-accent-neon/5 to-transparent" />

  <div className="text-center z-10 px-6">
    <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
      MOTION IS YOUR NEXT AI
    </h1>
    <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl mx-auto">
      Create professional-grade human motion, faster and simpler than ever
    </p>
    <div className="flex gap-4 justify-center">
      <PrimaryCTA>Order Now</PrimaryCTA>
      <SecondaryCTA>Learn More</SecondaryCTA>
    </div>
  </div>
</section>
```

---

## 애니메이션 가이드

### Transition Durations

| 속도 | 값 | 용도 |
|------|-----|------|
| Fast | 150ms | 호버 색상 변경 |
| Normal | 300ms | 버튼, 카드 상태 변경 |
| Slow | 500ms | 페이지 전환, 모달 |

### Easing Functions

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

### Framer Motion 예시

```jsx
import { motion } from 'framer-motion';

// 페이드 인 업
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
>
  Content
</motion.div>

// 스태거 애니메이션
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};
```

---

## 레이아웃 시스템

### Container Widths

| 브레이크포인트 | 최대 너비 |
|--------------|----------|
| sm (640px) | 100% |
| md (768px) | 100% |
| lg (1024px) | 1024px |
| xl (1280px) | 1280px |
| 2xl (1536px) | 1400px |

### Spacing Scale

```
4px  - gap-1
8px  - gap-2
12px - gap-3
16px - gap-4
24px - gap-6
32px - gap-8
48px - gap-12
64px - gap-16
96px - gap-24
```

### Grid System

```jsx
// 3열 그리드
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card />
  <Card />
  <Card />
</div>

// 비대칭 그리드
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
  <div className="lg:col-span-7">Main Content</div>
  <div className="lg:col-span-5">Sidebar</div>
</div>
```

---

## Gemini 연동 프롬프트 템플릿

frontend-specialist가 Gemini에게 컴포넌트 생성 요청 시 사용:

```
컴포넌트 생성 요청:

디자인 시스템: MOVIN Design System
- 배경: 다크모드 (#0a0a0a)
- 강조색: 네온 그린 (#c8ff00)
- 폰트: Inter/Pretendard

컴포넌트: {component_name}
요구사항: {requirements}

스타일링: Tailwind CSS
프레임워크: React + TypeScript
애니메이션: Framer Motion (선택)

MOVIN 스타일 가이드를 준수하여 생성해주세요.
```

---

## 적용 예시

### frontend-specialist 작업 흐름

```
1. UI 컴포넌트 필요
   ↓
2. movin-design-system 참조
   ↓
3. Gemini MCP 호출 (필요 시)
   ├── gemini_design_component() - 컴포넌트 코드 생성
   └── gemini_code_review() - 스타일 일관성 검토
   ↓
4. 생성된 코드에 디자인 토큰 적용
   ↓
5. 애니메이션 추가 (Framer Motion)
   ↓
6. 반응형 검증
```

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-17 | 초기 버전 - MOVIN3D 디자인 분석 기반 생성 |

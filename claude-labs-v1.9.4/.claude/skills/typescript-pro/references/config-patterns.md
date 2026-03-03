# TypeScript 설정 패턴

> **로드 시점**: tsconfig, 모듈 시스템, 빌드 설정 시

---

## tsconfig.json 최적 설정

### 엄격한 타입 체크 (Strict Mode)

```json
{
  "compilerOptions": {
    "strict": true,  // 모든 strict 옵션 활성화

    // strict가 포함하는 옵션들:
    "strictNullChecks": true,           // null/undefined 엄격 체크
    "strictFunctionTypes": true,        // 함수 매개변수 양방향 공변성 금지
    "strictBindCallApply": true,        // bind/call/apply 타입 체크
    "strictPropertyInitialization": true, // 클래스 속성 초기화 강제
    "noImplicitThis": true,             // this 타입 명시 강제
    "alwaysStrict": true,               // "use strict" 자동 삽입
    "noImplicitAny": true,              // 암시적 any 금지

    // 추가 엄격 옵션
    "noUncheckedIndexedAccess": true,   // 인덱스 접근 시 undefined 체크
    "noImplicitReturns": true,          // 모든 코드 경로에서 반환 강제
    "noFallthroughCasesInSwitch": true, // switch문 fallthrough 금지
    "noUnusedLocals": true,             // 사용하지 않는 지역 변수 금지
    "noUnusedParameters": true,         // 사용하지 않는 매개변수 금지
    "exactOptionalPropertyTypes": true  // 선택적 속성에 undefined 명시 강제
  }
}
```

### 최신 JavaScript 타겟 (ESNext)

```json
{
  "compilerOptions": {
    "target": "ES2022",              // 최신 문법 사용 (또는 "ESNext")
    "lib": ["ES2022", "DOM"],        // 표준 라이브러리
    "module": "ESNext",              // ESM 모듈 시스템
    "moduleResolution": "bundler",   // Vite/esbuild 등 번들러용 (TS 5.0+)

    // 또는 Node.js 환경
    "module": "NodeNext",            // Node.js ESM
    "moduleResolution": "NodeNext"   // Node.js 모듈 해석
  }
}
```

### 경로 별칭 (Path Aliases)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

사용 예:
```typescript
// ❌ 상대 경로 지옥
import { Button } from "../../../components/Button";

// ✅ 절대 경로
import { Button } from "@components/Button";
```

### 출력 설정

```json
{
  "compilerOptions": {
    "outDir": "./dist",              // 컴파일 결과물 디렉토리
    "rootDir": "./src",              // 소스 루트 디렉토리
    "declaration": true,             // .d.ts 파일 생성
    "declarationMap": true,          // .d.ts.map 파일 생성 (IDE 지원)
    "sourceMap": true,               // .map 파일 생성 (디버깅)
    "removeComments": false,         // JSDoc 주석 유지
    "emitDeclarationOnly": false     // .d.ts만 생성 (번들러가 JS 처리)
  }
}
```

### 완전한 프로덕션 설정 예시

```json
{
  "compilerOptions": {
    // 언어 & 타겟
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",              // React 17+ (또는 "preserve")

    // 타입 체크
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,

    // 모듈 해석
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "resolveJsonModule": true,       // JSON 파일 import 허용
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,

    // 출력
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,

    // 기타
    "skipLibCheck": true,            // node_modules 타입 체크 스킵 (빌드 속도)
    "forceConsistentCasingInFileNames": true,
    "allowJs": false,                // JS 파일 허용 안 함
    "checkJs": false,
    "isolatedModules": true          // Babel/esbuild 호환성
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## 모듈 시스템

### ESM vs CommonJS

#### ESM (권장)

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"  // 또는 "NodeNext"
  }
}
```

```typescript
// 명명된 export/import
export function add(a: number, b: number) {
  return a + b;
}

import { add } from "./math";

// 기본 export/import
export default class Calculator {}
import Calculator from "./Calculator";

// 네임스페이스 import
import * as math from "./math";
math.add(1, 2);
```

#### CommonJS (레거시)

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node"
  }
}
```

```typescript
// exports
export function add(a: number, b: number) {
  return a + b;
}
// 컴파일 결과: exports.add = function(a, b) { return a + b; }

// require
import { add } from "./math";
// 컴파일 결과: const math_1 = require("./math");
```

### moduleResolution 옵션

| 옵션 | 사용 시기 | 특징 |
|------|----------|------|
| `bundler` (TS 5.0+) | Vite, esbuild, Webpack | 번들러가 모듈 해석 처리 |
| `NodeNext` | Node.js 16+ ESM | package.json "type": "module" 필요 |
| `node` | Node.js CJS 또는 레거시 | require() 기반 |
| `classic` | 사용 안 함 | 구형 TypeScript 호환성 |

### package.json 타입 정의

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "type": "module",  // ESM 사용
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"  // CJS 호환
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.js"
    }
  },
  "files": ["dist"]
}
```

---

## 빌드 도구

### tsc (TypeScript Compiler)

```bash
# 기본 빌드
npx tsc

# watch 모드
npx tsc --watch

# 타입 체크만 (빌드 X)
npx tsc --noEmit

# 특정 파일만
npx tsc src/index.ts --outDir dist
```

package.json 스크립트:
```json
{
  "scripts": {
    "build": "tsc",
    "type-check": "tsc --noEmit",
    "dev": "tsc --watch"
  }
}
```

### esbuild (빠른 번들러)

```bash
npm install -D esbuild
```

```json
// package.json
{
  "scripts": {
    "build": "esbuild src/index.ts --bundle --outfile=dist/index.js --platform=node --target=es2022",
    "type-check": "tsc --noEmit"
  }
}
```

esbuild 설정 파일 (build.js):
```javascript
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/index.js",
  platform: "node",
  target: "es2022",
  format: "esm",
  sourcemap: true,
  minify: true,
  external: ["express", "prisma"]  // 번들에서 제외
});
```

### SWC (Rust 기반 컴파일러)

```bash
npm install -D @swc/core @swc/cli
```

.swcrc:
```json
{
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "tsx": true,
      "decorators": true
    },
    "target": "es2022",
    "transform": {
      "react": {
        "runtime": "automatic"
      }
    }
  },
  "module": {
    "type": "es6"
  }
}
```

package.json:
```json
{
  "scripts": {
    "build": "swc src -d dist",
    "type-check": "tsc --noEmit"
  }
}
```

### tsup (esbuild 래퍼)

```bash
npm install -D tsup
```

```json
// package.json
{
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --clean"
  }
}
```

tsup.config.ts:
```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,         // .d.ts 생성
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  target: "es2022",
  outDir: "dist"
});
```

### 빌드 도구 비교

| 도구 | 속도 | 타입 체크 | 번들링 | 사용 시기 |
|------|------|----------|--------|----------|
| tsc | 느림 | ✅ | ❌ | 타입 정의(.d.ts) 생성 |
| esbuild | 매우 빠름 | ❌ | ✅ | 프로덕션 번들링 |
| SWC | 매우 빠름 | ❌ | ❌ | 트랜스파일만 |
| tsup | 빠름 | ❌ | ✅ | 라이브러리 빌드 (esbuild + DTS) |

**권장 조합**:
```json
{
  "scripts": {
    "build": "tsup",           // 빌드 (esbuild + .d.ts)
    "type-check": "tsc --noEmit"  // 타입 체크만
  }
}
```

---

## 모노레포 설정

### Project References (프로젝트 참조)

디렉토리 구조:
```
monorepo/
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── client/
│   │   ├── src/
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── server/
│       ├── src/
│       ├── tsconfig.json
│       └── package.json
├── tsconfig.base.json
└── tsconfig.json
```

tsconfig.base.json (공통 설정):
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,  // 프로젝트 참조 활성화
    "skipLibCheck": true
  }
}
```

packages/shared/tsconfig.json:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

packages/client/tsconfig.json:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "references": [
    { "path": "../shared" }  // shared 패키지 참조
  ],
  "include": ["src/**/*"]
}
```

루트 tsconfig.json:
```json
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/client" },
    { "path": "./packages/server" }
  ]
}
```

빌드:
```bash
# 전체 모노레포 빌드 (의존성 순서 자동 해결)
npx tsc --build

# watch 모드
npx tsc --build --watch

# 클린 빌드
npx tsc --build --clean
```

### 패키지 간 타입 공유

packages/shared/src/types.ts:
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
}
```

packages/client/src/components/UserProfile.tsx:
```typescript
import type { User } from "@monorepo/shared";

export function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

packages/shared/package.json:
```json
{
  "name": "@monorepo/shared",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

루트 package.json (workspaces):
```json
{
  "name": "monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ]
}
```

---

## 환경별 설정

### 개발 환경

tsconfig.dev.json:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": true,
    "noUnusedLocals": false,       // 개발 중 경고 무시
    "noUnusedParameters": false,
    "incremental": true,           // 증분 컴파일 (빌드 속도)
    "tsBuildInfoFile": "./.tsbuildinfo"
  }
}
```

### 프로덕션 환경

tsconfig.prod.json:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": false,
    "removeComments": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "declaration": true
  }
}
```

package.json:
```json
{
  "scripts": {
    "dev": "tsc -p tsconfig.dev.json --watch",
    "build": "tsc -p tsconfig.prod.json"
  }
}
```

### 테스트 환경

tsconfig.test.json:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"],
    "esModuleInterop": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

---

## 라이브러리 배포 설정

### 타입 정의 포함

tsconfig.json:
```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

package.json:
```json
{
  "name": "my-library",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist"
  ],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "prepublishOnly": "npm run build"
  }
}
```

### API Extractor (타입 롤업)

```bash
npm install -D @microsoft/api-extractor
```

api-extractor.json:
```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
  "mainEntryPointFilePath": "<projectFolder>/dist/index.d.ts",
  "bundledPackages": [],
  "dtsRollup": {
    "enabled": true,
    "untrimmedFilePath": "<projectFolder>/dist/index.d.ts"
  }
}
```

장점:
- 여러 .d.ts 파일을 하나로 병합
- 내부 타입 제거 (export되지 않은 타입)
- 타입 호환성 검증

---

## 성능 최적화

### skipLibCheck

```json
{
  "compilerOptions": {
    "skipLibCheck": true  // node_modules 타입 체크 스킵 (빌드 속도 10배↑)
  }
}
```

### incremental 컴파일

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./.tsbuildinfo"
  }
}
```

### 병렬 빌드 (모노레포)

```bash
# tsc --build는 자동으로 병렬 빌드
npx tsc --build --verbose

# Turborepo 사용 (추천)
npm install -g turbo
turbo run build  # 의존성 그래프 기반 병렬 빌드
```

---

**참조**: SKILL.md의 "설정 패턴" 라우팅
**업데이트**: 2026-02-15

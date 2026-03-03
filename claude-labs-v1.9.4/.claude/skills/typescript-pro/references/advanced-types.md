# TypeScript 고급 타입

> **로드 시점**: 제네릭, 유틸리티 타입, 타입 가드 사용 시

---

## 제네릭 심화

### Constrained Generics (제약 제네릭)

```typescript
// 기본 제약
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "Alice", age: 30 };
const name = getProperty(user, "name"); // string
const age = getProperty(user, "age");   // number

// 다중 제약
interface Lengthwise {
  length: number;
}

function logLength<T extends Lengthwise>(arg: T): T {
  console.log(arg.length);
  return arg;
}

logLength("hello");        // OK
logLength([1, 2, 3]);      // OK
logLength({ length: 10 }); // OK
// logLength(100);         // Error: number에 length 없음
```

### Conditional Types (조건부 타입)

```typescript
// 기본 조건부 타입
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false

// 실용적인 예제: NonNullable 재구현
type MyNonNullable<T> = T extends null | undefined ? never : T;

type C = MyNonNullable<string | null>; // string
type D = MyNonNullable<number | undefined>; // number

// 분산 조건부 타입 (Distributive Conditional Types)
type ToArray<T> = T extends unknown ? T[] : never;

type E = ToArray<string | number>; // string[] | number[]
```

### Mapped Types (매핑 타입)

```typescript
// 기본 매핑 타입
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

type Partial<T> = {
  [K in keyof T]?: T[K];
};

// 고급: Key Remapping (TS 4.1+)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number; }

// 조건부 키 필터링
type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

type StringFields = PickByType<Person, string>; // { name: string }
```

### Template Literal Types (템플릿 리터럴 타입)

```typescript
type EventName = "click" | "focus" | "blur";
type ElementEvent = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur"

// 복합 사용
type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";
type Endpoint = "/users" | "/posts";
type APIRoute = `${HTTPMethod} ${Endpoint}`;
// "GET /users" | "POST /users" | "PUT /users" | ...

// 실용적인 예제: CSS 속성
type CSSProperty = "color" | "background-color" | "font-size";
type CSSValue<T extends CSSProperty> =
  T extends "font-size" ? `${number}px` | `${number}rem` :
  T extends "color" | "background-color" ? `#${string}` | `rgb(${number}, ${number}, ${number})` :
  string;

const fontSize: CSSValue<"font-size"> = "16px"; // OK
// const invalidSize: CSSValue<"font-size"> = "#fff"; // Error
```

---

## 유틸리티 타입

### Partial, Required

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
}

// Partial: 모든 필드 선택적
type UserUpdate = Partial<User>;
// { id?: string; name?: string; email?: string; age?: number; }

// Required: 모든 필드 필수
type CompleteUser = Required<User>;
// { id: string; name: string; email: string; age: number; }
```

### Pick, Omit

```typescript
// Pick: 특정 필드만 선택
type UserPreview = Pick<User, "id" | "name">;
// { id: string; name: string; }

// Omit: 특정 필드 제외
type UserWithoutEmail = Omit<User, "email">;
// { id: string; name: string; age?: number; }

// 실용적인 예제: API 응답 정의
interface DBUser extends User {
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

type PublicUser = Omit<DBUser, "passwordHash">;
```

### Record

```typescript
// 객체 타입 정의
type Role = "admin" | "user" | "guest";
type Permissions = Record<Role, string[]>;

const permissions: Permissions = {
  admin: ["read", "write", "delete"],
  user: ["read", "write"],
  guest: ["read"]
};

// 동적 키
type PageInfo = Record<string, { title: string; description: string }>;

const pages: PageInfo = {
  home: { title: "Home", description: "Welcome" },
  about: { title: "About", description: "About us" }
};
```

### Exclude, Extract

```typescript
type T1 = Exclude<"a" | "b" | "c", "a">; // "b" | "c"
type T2 = Exclude<string | number | (() => void), Function>; // string | number

type T3 = Extract<"a" | "b" | "c", "a" | "f">; // "a"
type T4 = Extract<string | number | (() => void), Function>; // () => void

// 실용적인 예제: 에러 타입 필터링
type APIError =
  | { code: 400; message: string }
  | { code: 401; message: string }
  | { code: 500; message: string };

type ClientError = Extract<APIError, { code: 400 | 401 }>;
type ServerError = Extract<APIError, { code: 500 }>;
```

### ReturnType, Parameters

```typescript
function createUser(name: string, age: number) {
  return { id: Math.random(), name, age };
}

type User = ReturnType<typeof createUser>;
// { id: number; name: string; age: number; }

type CreateUserParams = Parameters<typeof createUser>;
// [name: string, age: number]

// 실용적인 예제: API 클라이언트
class API {
  async fetchUser(id: string): Promise<User> {
    // ...
  }
}

type FetchUserReturn = ReturnType<API["fetchUser"]>; // Promise<User>
type Awaited<T> = T extends Promise<infer U> ? U : T;
type UserData = Awaited<FetchUserReturn>; // User
```

---

## 타입 가드

### is 타입 가드

```typescript
interface Cat {
  type: "cat";
  meow: () => void;
}

interface Dog {
  type: "dog";
  bark: () => void;
}

type Animal = Cat | Dog;

function isCat(animal: Animal): animal is Cat {
  return animal.type === "cat";
}

function handleAnimal(animal: Animal) {
  if (isCat(animal)) {
    animal.meow(); // Cat으로 좁혀짐
  } else {
    animal.bark(); // Dog로 좁혀짐
  }
}

// 실용적인 예제: 배열 필터링
function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

const values: (number | null)[] = [1, null, 2, null, 3];
const numbers: number[] = values.filter(isNotNull); // number[]
```

### asserts 타입 가드 (TS 3.7+)

```typescript
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("Not a string");
  }
}

function processValue(value: unknown) {
  assertIsString(value);
  // 이 시점부터 value는 string으로 처리됨
  console.log(value.toUpperCase());
}

// 실용적인 예제: 런타임 검증
function assertNonNull<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error("Value is null or undefined");
  }
}

function getUserName(user: User | null): string {
  assertNonNull(user);
  return user.name; // user는 User로 보장됨
}
```

### satisfies 연산자 (TS 4.9+)

```typescript
type Colors = "red" | "green" | "blue";

// as const로 리터럴 유지 + 타입 체크
const palette = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255]
} satisfies Record<Colors, string | number[]>;

// palette.red의 타입: [number, number, number] (리터럴 유지)
// palette.green의 타입: "#00ff00" (리터럴 유지)

// as 캐스팅과의 차이
const wrongPalette = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255]
} as Record<Colors, string | number[]>;

// wrongPalette.red의 타입: string | number[] (넓어짐)
```

---

## const type parameters (TS 5.0+)

### 기본 사용법

```typescript
// 기존: 리터럴 타입이 넓혀짐
function oldMakeArray<T>(items: T[]): T[] {
  return items;
}

const oldResult = oldMakeArray(["a", "b"]); // string[]

// const: 리터럴 타입 유지
function newMakeArray<const T>(items: T[]): T[] {
  return items;
}

const newResult = newMakeArray(["a", "b"]); // readonly ["a", "b"]
```

### 실용적인 예제

```typescript
// 설정 객체 리터럴 유지
function createConfig<const T extends Record<string, unknown>>(config: T): Readonly<T> {
  return Object.freeze(config);
}

const config = createConfig({
  apiUrl: "https://api.example.com",
  timeout: 5000
});

// config.apiUrl의 타입: "https://api.example.com"
// config.timeout의 타입: 5000

// 라우트 정의
function defineRoutes<const T extends Record<string, string>>(routes: T) {
  return routes;
}

const routes = defineRoutes({
  home: "/",
  users: "/users",
  profile: "/users/:id"
});

// routes.home의 타입: "/"
// routes.users의 타입: "/users"
```

---

## Discriminated Unions

### 기본 패턴

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; sideLength: number }
  | { kind: "rectangle"; width: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.sideLength ** 2;
    case "rectangle":
      return shape.width * shape.height;
  }
}
```

### 비동기 상태 모델링

```typescript
type AsyncData<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

function renderUser(state: AsyncData<User>) {
  switch (state.status) {
    case "idle":
      return "Click to load";
    case "loading":
      return "Loading...";
    case "success":
      return `User: ${state.data.name}`;
    case "error":
      return `Error: ${state.error.message}`;
  }
}
```

### API 응답 모델링

```typescript
type APIResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: number; message: string } };

async function fetchUser(id: string): Promise<APIResponse<User>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: { code: 500, message: String(error) } };
  }
}

const result = await fetchUser("123");
if (result.ok) {
  console.log(result.data.name); // 타입 안전
} else {
  console.error(result.error.message); // 타입 안전
}
```

---

## infer 키워드

### 기본 사용법

```typescript
// 함수 반환 타입 추출 (ReturnType 재구현)
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function foo() {
  return { a: 1, b: "hello" };
}

type FooReturn = MyReturnType<typeof foo>; // { a: number; b: string; }

// 배열 요소 타입 추출
type ElementType<T> = T extends (infer U)[] ? U : never;

type Numbers = ElementType<number[]>; // number
type Mixed = ElementType<(string | number)[]>; // string | number
```

### 프로미스 언래핑

```typescript
type Awaited<T> = T extends Promise<infer U> ? U : T;

type A = Awaited<Promise<string>>; // string
type B = Awaited<Promise<Promise<number>>>; // Promise<number> (1단계만 언래핑)

// 재귀적 언래핑 (TS 4.5+ 내장 Awaited와 동일)
type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T;

type C = DeepAwaited<Promise<Promise<number>>>; // number
```

### 튜플 첫/마지막 요소 추출

```typescript
type First<T extends unknown[]> = T extends [infer F, ...unknown[]] ? F : never;
type Last<T extends unknown[]> = T extends [...unknown[], infer L] ? L : never;

type Tuple = [string, number, boolean];
type A = First<Tuple>; // string
type B = Last<Tuple>;  // boolean
```

---

## 고급 패턴

### Branded Types (브랜드 타입)

```typescript
// 런타임에는 동일하지만 타입 시스템에서 구분
type Brand<T, Brand> = T & { __brand: Brand };

type UserId = Brand<string, "UserId">;
type ProductId = Brand<string, "ProductId">;

function getUserById(id: UserId): User { /* ... */ }
function getProductById(id: ProductId): Product { /* ... */ }

const userId = "user-123" as UserId;
const productId = "product-456" as ProductId;

getUserById(userId); // OK
// getUserById(productId); // Error: ProductId는 UserId와 호환되지 않음

// 스마트 생성자 패턴
function createUserId(value: string): UserId {
  if (!value.startsWith("user-")) {
    throw new Error("Invalid user ID");
  }
  return value as UserId;
}
```

### Builder Pattern (빌더 패턴)

```typescript
class UserBuilder {
  private user: Partial<User> = {};

  setName(name: string): this {
    this.user.name = name;
    return this;
  }

  setEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  build(): User {
    if (!this.user.name || !this.user.email) {
      throw new Error("Missing required fields");
    }
    return this.user as User;
  }
}

const user = new UserBuilder()
  .setName("Alice")
  .setEmail("alice@example.com")
  .build();
```

### Recursive Types (재귀 타입)

```typescript
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

const validJSON: JSONValue = {
  name: "Alice",
  age: 30,
  tags: ["developer", "typescript"],
  nested: {
    deep: {
      value: true
    }
  }
};

// 트리 구조
type TreeNode<T> = {
  value: T;
  children: TreeNode<T>[];
};

const tree: TreeNode<number> = {
  value: 1,
  children: [
    { value: 2, children: [] },
    { value: 3, children: [{ value: 4, children: [] }] }
  ]
};
```

---

**참조**: SKILL.md의 "고급 타입" 라우팅
**업데이트**: 2026-02-15

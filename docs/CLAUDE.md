# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(claude.ai/code)에게 지침을 제공합니다.

## 명령어

```bash
npm run dev       # 개발 서버 실행
npm run build     # 프로덕션 빌드
npm run lint      # Next.js 기반 ESLint
npm test          # Vitest 워치 모드
npm run test:run  # Vitest 단일 실행 (CI 스타일)
```

특정 테스트 파일 또는 이름으로 단일 테스트 실행:

```bash
npx vitest run src/components/__tests__/ReviewCard.test.tsx
npx vitest run -t "renders highlight"
```

테스트는 **Vitest + jsdom** 환경에서 `@testing-library/react`와 함께 사용합니다. `@testing-library/jest-dom`의 전역 매처는 `vitest.setup.ts`에서 로드됩니다. 경로 별칭(`@/*`, `@supabase/*`)은 `vitest.config.ts`에 동일하게 설정되어 있습니다.

의존성 설치 시 `.npmrc`에 설정된 **TipTap Pro** 프라이빗 레지스트리(`@tiptap-pro:registry=https://registry.tiptap.dev/`)에 접근할 수 있어야 합니다.

## 아키텍처

**글또 4기 독서모임** — 글또 멤버를 위한 독서모임 웹 애플리케이션.

### 기술 스택

- **Next.js 16 App Router**, React 19, TypeScript
- **Supabase** (PostgreSQL + Auth) — ORM 없이 JS 클라이언트 직접 사용
- 클라이언트 측 서버 상태 관리를 위한 **TanStack Query**
- **TipTap 3** (리치 텍스트 에디터, `.npmrc`의 프라이빗 npm 레지스트리 사용)
- 홈페이지 및 문장 수집 페이지의 3D 비주얼을 위한 **Three.js / @react-three/fiber**
- 스타일링을 위한 **Tailwind CSS 4 + Radix UI**

### 경로 별칭

- `@/*` → `./src/*`
- `@supabase/*` → `./supabase/*`

### 디렉터리 구조

```
src/
  app/             # Next.js App Router 페이지 및 API 라우트
    (public)/      # 공개 라우트 그룹 (홈페이지, 인증)
    (member)/      # 보호된 라우트 (리뷰, 주제, 문장 수집, 프로필)
    admin/         # 관리자 전용 라우트 (일정, 참석자, 사용자 관리)
    api/           # API 라우트 핸들러
  components/
    ui/                  # Radix + Tailwind 프리미티브 (button, dialog, ...)
    tiptap/              # 공용 TipTap 렌더링 및 sanitize 헬퍼
    editor-extension/    # 커스텀 TipTap 노드/마크 확장
    __tests__/           # 컴포넌트 테스트 (Vitest + RTL)
  lib/             # 유틸리티, 인증 헬퍼, 도메인 로직 (highlight, reactions)
supabase/
  client.ts        # 브라우저용 Supabase 클라이언트
  server.ts        # 서버용 Supabase 클라이언트
  middleware.ts    # OAuth 콜백 및 세션 갱신
  types.ts         # 자동 생성된 DB 타입
  schema.sql       # 데이터베이스 스키마 원본
```

### 인증 및 세션

- Supabase Auth를 통한 **카카오 OAuth**
- 세 가지 역할: `pending` | `member` | `admin`
- 서버: `src/lib/auth.ts`의 `getSessionUser()` (`React.cache`로 캐싱)
- 클라이언트: `SessionProvider` 컨텍스트(`src/components/SessionProvider.tsx`)를 통한 `useSession()` 훅
- `ensureRole()` 헬퍼는 페이지 라우트에서 권한이 없는 사용자를 리다이렉트
- API 라우트는 `sessionUser.role`을 확인하고 권한이 없으면 403을 반환

### 데이터 흐름

1. `src/middleware.ts`가 모든 요청을 가로채 Supabase 세션을 갱신하고 OAuth 콜백을 처리
2. 서버 컴포넌트는 `createSupabaseServerClient()`를 호출해 DB에 직접 접근
3. 클라이언트 컴포넌트는 `SessionProvider` 컨텍스트의 Supabase 클라이언트를 사용
4. 변경(mutation) 작업은 API 라우트(`/api/...`)를 거치며, 세션을 검증한 뒤 DB에 기록

### 데이터베이스

테이블: `users`, `schedules`, `schedule_attendees`, `reviews`, `review_comments`, `review_reactions`, `review_highlights`, `topics`, `topic_comments`, `quotes`, `quote_reactions`

모든 테이블은 Row-Level Security(RLS)가 활성화되어 있습니다. 전체 스키마는 `supabase/schema.sql`을 참고하세요. `supabase/types.ts`는 해당 스키마로부터 생성되므로, 스키마가 변경될 경우 수동 수정 대신 재생성하세요.

### 리치 텍스트 (TipTap)

- 에디터는 `@tiptap/starter-kit`과 `src/components/editor-extension/` 하위의 커스텀 확장(highlight, horizontal-rule, image, list, strike)을 함께 사용합니다.
- 저장된 콘텐츠를 서버/클라이언트에서 렌더링할 때는 반드시 `src/components/tiptap/renderTiptapContent.tsx`와 `sanitize.ts`를 거쳐야 하며, 리뷰/주제의 원본 HTML을 직접 렌더링하지 마세요.
- `src/lib/highlight.ts`는 에디터와 댓글 사이드바가 공유하는 리뷰 하이라이트의 선택/범위(selection/range) 모델을 담당합니다.

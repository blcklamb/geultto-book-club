# 프로덕트 개선 계획

## Context

글또 독서모임 앱의 사용성 개선을 위한 작업 목록. 실시간성, UX, 데이터 표시 정확성 세 축으로 분류한다.

## 문서 사용법

- [ ] 작업 전: 상단의 **확정 정책 요약**과 항목별 **확정 정책**을 확인한다.
- [ ] 작업 중: 항목 제목의 체크박스를 완료 상태로 바꾼다.
- [ ] 작업 후: 각 항목의 **검증 체크리스트**를 확인한다.
- [ ] 배포 전: 하단의 **전체 검증 체크리스트**를 완료한다.

## 결정 완료 요약

- [x] 독후감 본문 최소 글자 수를 500자로 확정할지, 운영 정책상 다른 기준이 필요한지 결정
  - 최소 글자 수를 500자로 확정
- [x] 글자 수 계산 기준을 plain text 기준으로 할지, 공백/개행 포함 여부를 정할지 결정
  - 공백/개행을 포함
- [x] 댓글/하이라이트 URL 자동 링크의 허용 프로토콜과 표시 방식을 결정
  - https만 포함, 표기 방식은 하이퍼링크처럼 보이도록
- [x] 댓글 정렬을 모든 상세 화면에서 최신순으로 통일할지 결정
  - 모든 상세 화면에서 통일
- [x] 모바일 하이라이트 패널을 right drawer로 유지할지 bottom sheet로 바꿀지 결정
  - 모바일의 경우 bottom sheet
- [x] Supabase Realtime을 적용할 테이블과 이벤트 범위를 결정
  - 독후감 댓글과 하이라이트와 하이라이트 코멘트만 적용
- [x] 프로필 변경 반영을 패널 열림 시 재조회로 충분히 볼지, 전역 refresh/realtime까지 할지 결정
  - 재조회로 충분
- [x] 메인 일정 링크 문제의 정확한 대상 화면을 확정
  - 메인 페이지에서 '다음 독서모임 일정' 중 '일정 상세 보기' 버튼 추가

## 확정 정책 요약

- 독후감 본문 최소 글자 수는 500자다.
- 글자 수는 TipTap plain text 기준으로 계산하며, 공백과 개행을 포함한다.
- 댓글/하이라이트 코멘트 자동 링크는 `https://` URL만 지원한다.
- 댓글 정렬은 모든 상세 화면에서 최신순으로 통일한다.
- 모바일 하이라이트 댓글 패널은 bottom sheet로 제공한다.
- Supabase Realtime은 독후감 댓글, 하이라이트, 하이라이트 코멘트에만 적용한다.
- 프로필 변경 반영은 패널 열림 시 최신 데이터 재조회로 처리한다.
- 메인 페이지의 "다음 독서모임 일정"에는 "일정 상세 보기" 버튼을 추가한다.

---

## 1. [ ] 시간 표시 통일 — 한국 시간(KST) 고정

**현상:** `LocalizedDate`가 `ko-KR` locale을 사용하지만 `timeZone`을 명시하지 않아 클라이언트 시스템 시간대에 의존한다. 해외 또는 UTC 환경에서 UTC 시각이 그대로 출력된다.

**수정 파일:** [src/components/LocalizedDate.tsx](../src/components/LocalizedDate.tsx)

**방법:** `formatLocalizedDate` 함수의 기본 options에 `timeZone: 'Asia/Seoul'`을 병합한다.

```ts
const merged = { timeZone: "Asia/Seoul", ...options };
return new Intl.DateTimeFormat(locale, merged).format(date);
```

**영향 범위:** 전체 앱의 날짜 컴포넌트가 일괄 수정됨. 별도 변경 불필요.

**검증 체크리스트:**

- [ ] KST가 아닌 시스템 시간대에서도 동일한 한국 시간이 표시됨
- [ ] 기존 날짜 표시 포맷이 과도하게 바뀌지 않음

---

## 2. [ ] 작성 시간 누락 항목 추가

**현상:** `ReviewCard`에는 날짜(year·month·day)만 표시되고 시각이 없다. 토론 목록 카드도 동일.

**수정 파일:**

- [src/components/ReviewCard.tsx](../src/components/ReviewCard.tsx) — `options`에 `timeStyle: "short"` 추가
- [src/app/topics/page.tsx](../src/app/topics/page.tsx) — 동일하게 시각 추가

**방법:**

```tsx
// before
options={{ year: "numeric", month: "numeric", day: "numeric" }}
// after
options={{ year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }}
```

**확정 정책:**

- 날짜와 시각은 독후감/토론 목록 카드에서 동일하게 노출한다.
- 시각 표기는 `ko-KR` 기본 표기인 `오후 3:04` 형식을 사용한다.

**검증 체크리스트:**

- [ ] 독후감 목록 카드에 작성 시각이 표시됨
- [ ] 토론 목록 카드에 작성 시각이 표시됨
- [ ] 모바일 카드에서 날짜/시각 줄바꿈이 어색하지 않음

---

## 3. [ ] 목록에서 댓글 수 표시

**현상:** 토론 목록은 댓글 수를 표시하지만 독후감 목록에는 없다.

**수정 파일:**

- [src/app/reviews/page.tsx](../src/app/reviews/page.tsx) — 독후감별 댓글/대댓글 수를 집계하고 `ReviewCard`에 `commentCount` prop 전달
- [src/components/ReviewCard.tsx](../src/components/ReviewCard.tsx) — `commentCount?: number` prop 추가, 카드 하단에 `💬 N` 표시

**집계 방법:**

- 1차로 독후감 목록과 `review_comments(count)`를 조회한다.
- 대댓글 포함을 위해 해당 독후감의 댓글 id를 기준으로 `review_comment_replies` 개수를 추가 집계한다.
- 구현 복잡도가 커지면 Supabase RPC 또는 view로 `review_comment_total_count`를 제공하는 방식을 검토한다.

**정책:**

- 댓글 수는 삭제되지 않은 댓글만 집계한다.
- 대댓글도 총 댓글 수에 포함한다.
- 댓글 수가 0개여도 `💬 0`을 표시한다.

**검증 체크리스트:**

- [ ] 독후감 목록에서 댓글 수가 표시됨
- [ ] 대댓글이 댓글 수에 포함됨
- [ ] 댓글 작성/삭제 후 목록 재진입 시 댓글 수가 맞게 갱신됨

---

## 4. [ ] 독후감 작성 시 글자 수 최소 validation

**현상:** 본문 길이 제한 없이 제출 가능하다.

**수정 파일:**

- [src/components/ReviewEditor.tsx](../src/components/ReviewEditor.tsx) — TipTap 에디터 하단에 `현재 글자 수 / 최소 N자` 카운터 표시, 최솟값 미달 시 submit 버튼 disabled
- [src/app/api/reviews/route.ts](../src/app/api/reviews/route.ts) — 서버 측에서도 `content_markdown` 길이 검증

**확정 정책:**

- 최소 글자 수는 500자다.
- 글자 수는 에디터의 plain text 기준으로 계산한다.
- 공백과 개행도 글자 수에 포함한다.
- 검증은 클라이언트와 서버 모두 적용한다.
- 기존 작성글 수정 시에도 동일한 최소 글자 수를 강제한다.
- 임시저장 기능이 생길 경우 최소 글자 수 검증은 최종 제출 시점에만 적용한다.

```tsx
const charCount = editor.getText().length;
const MIN_CHARS = 500;
// 에디터 하단
<p className="text-xs text-slate-400 text-right">
  {charCount} / {MIN_CHARS}자 이상
</p>;
```

**검증 체크리스트:**

- [ ] 500자 미만 입력 시 제출 버튼이 비활성화됨
- [ ] 수정 화면에서도 500자 미만 저장이 차단됨
- [ ] 500자 미만 요청은 API에서도 거절됨
- [ ] 공백과 개행이 글자 수에 포함됨
- [ ] HTML 태그/마크다운 문법이 글자 수를 부풀리지 않음

---

## 5. [ ] 댓글·하이라이트 코멘트 링크 하이퍼링크화

**현상:** 댓글/하이라이트 코멘트 본문(`body`)이 plain text로 저장·렌더링되어 URL이 클릭 불가능한 텍스트로 출력된다.

**방법:** URL을 `<a>` 태그로 치환하는 유틸 컴포넌트를 만들고, 댓글 본문 렌더링 위치에 적용한다.

**신규 파일:** `src/components/LinkedText.tsx`

```tsx
const URL_RE = /(https:\/\/[^\s]+)/g;
const URL_PART_RE = /^https:\/\/[^\s]+$/;

export function LinkedText({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        URL_PART_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600 break-all"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
```

**적용 위치:**

- [src/components/CommentThread.tsx](../src/components/CommentThread.tsx) — `comment.body` / `reply.body` 렌더링
- [src/components/HighlightCommentPanel.tsx](../src/components/HighlightCommentPanel.tsx) — 동일

**정책:**

- 허용 프로토콜은 `https://`만 적용한다.
- 링크는 새 탭으로 열고 `rel="noopener noreferrer"`를 적용한다.
- XSS 방지를 위해 HTML 문자열 삽입 대신 React node 배열로 렌더링한다.
- 링크는 밑줄과 링크 컬러를 적용해 일반 하이퍼링크처럼 보이게 한다.
- 프로토콜 없는 URL, `http://` URL, `mailto:`는 자동 링크 처리하지 않는다.
- 긴 URL은 원문을 유지하되 `break-all`로 레이아웃 넘침을 방지한다.
- URL 뒤에 붙은 마침표, 쉼표, 닫는 괄호 같은 문장부호는 링크 범위에서 제외한다.

**검증 체크리스트:**

- [ ] 댓글 URL이 클릭 가능한 링크로 표시됨
- [ ] 하이라이트 댓글 URL이 클릭 가능한 링크로 표시됨
- [ ] `http://` URL은 자동 링크 처리되지 않음
- [ ] URL 뒤의 마침표/괄호 같은 문장부호가 링크에 잘못 포함되지 않음

---

## 6. [ ] 하이라이트 인용문 줄바꿈 처리

**현상:** 하이라이트 텍스트에 개행이 포함되어 있어도 `HighlightCommentPanel`의 blockquote에서 줄바꿈이 렌더링되지 않는다.

**수정 파일:** [src/components/HighlightCommentPanel.tsx](../src/components/HighlightCommentPanel.tsx)

**방법:** blockquote에 `whitespace-pre-wrap` 클래스 추가.

```tsx
// before
<blockquote className="... italic">
// after
<blockquote className="... italic whitespace-pre-wrap">
```

**검증 체크리스트:**

- [ ] 여러 줄 하이라이트가 원문 줄바꿈을 유지함
- [ ] 긴 문장이 패널 너비 밖으로 넘치지 않음

---

## 7. [ ] 하이라이트 댓글 Drawer — dimmed 배경 제거

**현상:** `HighlightCommentPanel`이 `Sheet` 컴포넌트를 사용하는데, `SheetOverlay`가 `bg-black/80`으로 전체 화면을 어둡게 덮어 독후감 본문을 가린다.

**수정 파일:** [src/components/HighlightCommentPanel.tsx](../src/components/HighlightCommentPanel.tsx)

**방법:** `SheetContent`에 `overlayClassName` prop을 전달하거나, `HighlightCommentPanel`에서 `SheetOverlay`를 비활성화한다. Radix Dialog/Sheet는 `SheetPortal` + `SheetContent` 조합으로 오버레이 없이 렌더링 가능.

```tsx
// SheetOverlay를 렌더링하지 않는 커스텀 SheetContent 사용
<SheetPortal>
  {/* SheetOverlay 제거 */}
  <SheetPrimitive.Content ref={ref} className={...}>
    {children}
  </SheetPrimitive.Content>
</SheetPortal>
```

`HighlightCommentPanel` 전용으로 `NoOverlaySheetContent` 컴포넌트를 `HighlightCommentPanel.tsx` 내에 인라인으로 정의한다. `ui/sheet.tsx`는 수정하지 않는다.

**정책:**

- 하이라이트 댓글 패널은 본문을 함께 보며 사용하는 보조 패널로 취급한다.
- 따라서 패널이 열려도 배경 클릭 차단/딤 처리를 하지 않는다.

**검증 체크리스트:**

- [ ] 패널이 열려도 독후감 본문이 어둡게 가려지지 않음
- [ ] ESC 또는 닫기 버튼으로 패널을 닫을 수 있음
- [ ] 패널 바깥 클릭 동작이 의도와 맞음

---

## 8. [ ] 하이라이트 댓글 Drawer — 내용 겹침 방지

**현상:** Sheet가 열릴 때 하이라이트 댓글 패널이 독후감 본문 위에 겹쳐 텍스트가 가려진다.

**원인:** `SheetContent`가 `fixed` + `z-50`으로 본문 위에 overlay됨.

**방법:** 독후감 상세 페이지([src/app/reviews/[id]/page.tsx](../src/app/reviews/%5Bid%5D/page.tsx))의 레이아웃을 수정하여, 데스크톱에서는 패널이 열리면 본문 영역이 좁아지는 side-by-side 레이아웃으로 전환한다. 모바일에서는 항목 13의 정책에 따라 bottom sheet를 사용한다.

```tsx
// ReviewViewerInteractive 컴포넌트 감싸는 div에 조건부 클래스
<div className={activeHighlight ? "mr-[28rem]" : ""}>
  <EditorContent editor={editor} />
</div>
// Sheet는 fixed right 패널로 유지하되 본문에 margin 추가
```

`ReviewViewerInteractive` 내부에서 `activeHighlightId`가 설정되면 wrapper div에 `pr-[28rem]` 또는 `mr-[28rem]`을 추가하는 방식으로 처리.

**확정 정책:**

- 데스크톱에서는 본문을 줄이는 side-by-side 방식을 사용한다.
- 패널 너비는 기본 `28rem`으로 두되, 좁은 화면에서는 `min(28rem, 100vw)` 계열의 responsive 값을 사용한다.

**검증 체크리스트:**

- [ ] 데스크톱에서 패널이 본문 텍스트를 가리지 않음
- [ ] 모바일에서는 bottom sheet로 열려 본문/패널이 좌우로 찌그러지지 않음
- [ ] 패널 열림/닫힘 시 레이아웃 점프가 과하지 않음

---

## 9. [ ] 하이라이트 프로필 사진 업데이트 지연 수정

**현상:** 하이라이트 작성자 프로필 이미지/데코레이션이 페이지 최초 로드 시 서버에서 가져온 값만 반영되고, 이후 프로필 변경이 반영되지 않는다.

**원인:** `user_profiles` 데이터를 서버 컴포넌트에서 1회 조회 후 highlights 객체에 embed함. Realtime 구독 없음.

**방법:** `router.refresh()`를 주기적으로 호출하지 않고, `HighlightCommentPanel`이 열릴 때 `/api/reviews/[id]/highlights`를 재조회해 최신 프로필 정보를 가져온다.

**확정 정책:**

- 프로필 변경 반영은 패널 열림 시 재조회로 충분하다.
- 프로필 변경 직후 이미 열린 모든 화면에 즉시 전파하는 전역 refresh/realtime은 이번 범위에서 제외한다.

**검증 체크리스트:**

- [ ] 프로필 이미지 변경 후 하이라이트 패널 재오픈 시 최신 이미지가 표시됨
- [ ] 프로필 데코레이션 변경도 함께 반영됨

---

## 10. [ ] 하이라이트 실시간 반영 (Supabase Realtime)

**현상:** 한 사용자가 하이라이트를 추가해도 다른 사용자 화면에 실시간으로 반영되지 않는다. 페이지를 새로고침해야 확인 가능.

**수정 파일:** [src/components/ReviewViewerInteractive.tsx](../src/components/ReviewViewerInteractive.tsx)

**방법:** `useEffect`에서 Supabase Realtime 채널을 구독한다.

```ts
import { createClient } from "@supabase/client";

useEffect(() => {
  const supabase = createClient();
  const channel = supabase
    .channel(`review-highlights-${reviewId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "review_highlights",
        filter: `review_id=eq.${reviewId}`,
      },
      async () => {
        // 변경 감지 시 highlights 재조회
        const res = await fetch(`/api/reviews/${reviewId}/highlights`);
        if (res.ok) {
          const updated = await res.json();
          setHighlights(updated);
          // 에디터 marks 재적용
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [reviewId]);
```

Supabase 대시보드에서 `review_highlights`, `highlight_comments` 테이블의 Realtime publication 활성화 필요.

하이라이트 코멘트도 동일하게 `highlight_comments` 테이블을 구독한다. `highlight_comments`에는 `review_id`가 직접 없으므로, 초기 구현은 테이블 이벤트를 수신한 뒤 현재 리뷰의 하이라이트 데이터를 재조회한다.

```ts
supabase
  .channel(`highlight-comments-${reviewId}`)
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "highlight_comments" },
    refetchHighlights,
  )
  .subscribe();
```

**정책:**

- Realtime 적용 대상은 하이라이트(`review_highlights`)와 하이라이트 코멘트(`highlight_comments`) 테이블이다.
- 토론 댓글은 이번 Realtime 적용 범위에서 제외한다.
- 초기 구현은 INSERT/UPDATE/DELETE 전체 이벤트를 구독한다.
- 이벤트 수신 시 단일 row patch보다 API 재조회로 정합성을 우선한다.
- 실시간 반영 실패 시 사용자에게 별도 안내를 띄우지 않고, 기존 수동 새로고침 동선을 유지한다.
- Supabase Realtime publication 설정은 배포 체크리스트에 포함한다.

**검증 체크리스트:**

- [ ] Supabase Realtime publication에 `review_highlights`, `highlight_comments`가 포함됨
- [ ] 두 브라우저 탭에서 하이라이트 추가가 반대편 탭에 반영됨
- [ ] 하이라이트 삭제가 반대편 탭에 반영됨
- [ ] 하이라이트 코멘트 추가/삭제가 반대편 탭에 반영됨
- [ ] 구독 해제 후 페이지 이동 시 중복 이벤트가 발생하지 않음

---

## 11. [ ] 독후감 댓글 실시간 반영 (Supabase Realtime)

**현상:** 독후감 댓글 작성 후 현재 사용자 화면에는 `router.refresh()`로 반영되지만, 다른 사용자 화면에는 반영되지 않는다.

**방법:** 클라이언트 Realtime 구독을 적용한다.

`CommentThread`를 Client Component로 유지하되 Supabase Realtime으로 댓글 변경을 구독한다. 댓글 state를 서버에서 초기화하고 클라이언트에서 업데이트한다.

**수정:** 독후감 상세([src/app/reviews/[id]/page.tsx](../src/app/reviews/%5Bid%5D/page.tsx))에 Realtime 구독 wrapper를 추가하거나, `CommentThread`에 `reviewId` prop을 추가해 내부에서 구독한다.

```ts
// review_comments 테이블 구독
.on("postgres_changes", { event: "*", schema: "public", table: "review_comments", filter: `review_id=eq.${reviewId}` }, handler)
```

**확정 정책:**

- Realtime 적용 대상은 독후감 댓글만 포함한다.
- 토론 댓글은 이번 Realtime 적용 범위에서 제외한다.
- INSERT/UPDATE/DELETE 전체 이벤트를 구독한다.
- 댓글 정렬은 최신순이므로 신규 댓글은 목록 앞쪽에 반영한다.

**검증 체크리스트:**

- [ ] 독후감 댓글 작성이 다른 탭에 반영됨
- [ ] 신규 독후감 댓글이 최신순 목록의 앞쪽에 표시됨
- [ ] 토론 댓글은 기존 동작을 유지함
- [ ] 댓글 삭제/수정 정책이 정해진 범위대로 반영됨

---

## 12. [ ] 댓글 최신순 정렬

**현상:** 토론 상세 페이지의 댓글이 `ascending: true` (오래된 순)로 조회된다. 독후감은 이미 `ascending: false`.

**수정 파일:** [src/app/topics/[id]/page.tsx](../src/app/topics/%5Bid%5D/page.tsx)

```ts
// before
.order("created_at", { ascending: true });
// after
.order("created_at", { ascending: false });
```

**확정 정책:**

- 모든 상세 화면의 댓글은 최신순을 기본으로 통일한다.
- 부모 댓글 목록은 최신순으로 표시한다.
- 대댓글은 대화 흐름을 위해 부모 댓글 내부에서 오래된 순으로 유지한다.

**검증 체크리스트:**

- [ ] 토론 상세 댓글이 최신순으로 표시됨
- [ ] 독후감 상세 댓글 정렬과 정책이 일치함
- [ ] 하이라이트 댓글도 최신순으로 표시됨
- [ ] 대댓글은 각 부모 댓글 아래에서 오래된 순으로 표시됨

---

## 13. [ ] 하이라이트 모바일 Bottom Sheet 전환 및 닫기 버튼 고정

**현상:** 모바일 환경에서 하이라이트 Drawer를 열면 `SheetHeader`(타이틀 + 닫기 버튼)가 화면 위쪽 잘린 영역에 있어 스크롤 없이는 보이지 않는다. 닫기 버튼(×)에 접근할 수 없어 Drawer를 닫을 방법이 없다.

**원인:** `SheetContent`가 `overflow-y-auto`로 설정되어 있어 헤더도 스크롤 영역에 포함됨. 또한 모바일에서 `w-full`이지만 높이가 뷰포트를 초과하면 헤더가 가려짐.

**수정 파일:** [src/components/HighlightCommentPanel.tsx](../src/components/HighlightCommentPanel.tsx)

**방법:**

1. `SheetHeader`를 스크롤 영역 밖으로 분리 — 헤더는 `sticky top-0`으로 고정, 댓글 목록만 스크롤
2. 모바일에서는 bottom sheet로 전환한다.
3. 닫기 버튼은 bottom sheet 상단 헤더에 항상 노출한다.

```tsx
// SheetContent 구조 변경
<SheetContent
  side={isMobile ? "bottom" : "right"}
  className="w-full sm:max-w-md flex flex-col p-0"
>
  {/* 헤더 고정 — 스크롤 밖 */}
  <SheetHeader className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b">
    <SheetTitle>하이라이트 댓글</SheetTitle>
    <blockquote ...>{highlight.highlightText}</blockquote>
    {/* 작성자 정보, 삭제 버튼 */}
  </SheetHeader>

  {/* 댓글 목록 + 입력창 — 스크롤 영역 */}
  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
    {/* 댓글 목록 */}
    {/* 댓글 입력 폼 */}
  </div>
</SheetContent>
```

**확정 정책:**

- 모바일에서는 `side="bottom"`으로 전환한다.
- bottom sheet 헤더는 스크롤 영역 밖에 두고, 닫기 버튼을 항상 접근 가능하게 둔다.

**검증 체크리스트:**

- [ ] 모바일에서 bottom sheet가 화면 하단에서 열림
- [ ] 모바일에서 패널을 열자마자 닫기 버튼이 보임
- [ ] 댓글 목록이 길어도 헤더가 사라지지 않음
- [ ] iOS Safari 기준 주소창 높이 변화에도 닫기 버튼 접근이 가능함

---

## 14. [ ] 메인 일정 클릭 시 일정 상세 이동

**현상:** 메인 페이지의 "다음 독서모임 일정" 영역에서 일정 상세로 이동하는 명시적인 동선이 부족하다.

**현재 코드:** [src/app/schedule/page.tsx](../src/app/schedule/page.tsx)는 이미 `<Link href={`/schedule/${schedule.id}`}>` 로 카드를 래핑 중.

**수정 파일:** 홈페이지([src/app/(public)/page.tsx](../src/app/%28public%29/page.tsx) 또는 유사 파일)

**방법:** 메인 페이지의 "다음 독서모임 일정" 영역에 `일정 상세 보기` 버튼을 추가하고 `/schedule/{schedule.id}`로 연결한다.

**확정 정책:**

- 대상 화면은 메인 페이지다.
- 카드 전체 클릭보다 명시적인 `일정 상세 보기` 버튼을 추가한다.
- 일정 목록과 관리자 일정 화면은 기존 동작을 유지한다.

**검증 체크리스트:**

- [ ] 메인 페이지 "다음 독서모임 일정"에 `일정 상세 보기` 버튼이 표시됨
- [ ] `일정 상세 보기` 버튼 클릭 시 일정 상세로 이동함
- [ ] 일정 목록 카드 클릭 시 기존처럼 상세로 이동함
- [ ] 관리자 일정 목록의 편집/관리 동선과 충돌하지 않음

---

## 구현 우선순위

| 우선순위 | 항목                                | 난이도 | 영향도 |
| -------- | ----------------------------------- | ------ | ------ |
| P0       | 1. UTC→KST (LocalizedDate timeZone) | 낮음   | 높음   |
| P0       | 7. Drawer dimmed 배경 제거          | 낮음   | 높음   |
| P0       | 6. 하이라이트 줄바꿈                | 낮음   | 중간   |
| P0       | 13. 모바일 Bottom Sheet 전환        | 낮음   | 높음   |
| P1       | 2. 작성 시간 추가                   | 낮음   | 중간   |
| P1       | 3. 댓글 수 표시                     | 낮음   | 중간   |
| P1       | 5. 링크 하이퍼링크화                | 낮음   | 중간   |
| P1       | 12. 댓글 최신순 정렬                | 낮음   | 중간   |
| P1       | 8. Drawer 본문 겹침 방지            | 중간   | 높음   |
| P2       | 4. 독후감 글자 수 validation        | 중간   | 중간   |
| P2       | 10. 하이라이트 실시간               | 높음   | 높음   |
| P2       | 11. 독후감 댓글 실시간              | 높음   | 높음   |
| P2       | 9. 하이라이트 프로필 사진           | 중간   | 낮음   |
| P3       | 14. 메인 일정 상세 버튼             | 낮음   | 중간   |

---

## 전체 검증 체크리스트

- [ ] **시간 표시:** 시스템 시간대를 UTC로 변경하고 댓글/독후감 목록에서 KST 시각이 출력되는지 확인
- [ ] **Drawer:** 하이라이트 클릭 시 오른쪽 패널이 열릴 때 배경이 어두워지지 않고 본문이 보이는지 확인
- [ ] **실시간:** 브라우저 두 탭을 열어 한쪽에서 독후감 댓글/하이라이트/하이라이트 코멘트 작성 시 다른 탭 자동 반영 확인
- [ ] **링크:** 댓글에 `https://` URL 입력 후 등록 → 클릭 가능한 하이퍼링크로 표시되는지 확인
- [ ] **글자 수 validation:** 500자 미만 입력 시 제출 버튼 비활성화, 500자 이상에서 활성화 확인
- [ ] **모바일 Bottom Sheet:** 모바일 뷰포트에서 하이라이트 클릭 → bottom sheet 열림 → 스크롤 없이 닫기(×) 버튼이 보이는지 확인
- [ ] **일정 링크:** 메인 페이지 "다음 독서모임 일정"의 `일정 상세 보기` 버튼이 상세 페이지로 이동하는지 확인

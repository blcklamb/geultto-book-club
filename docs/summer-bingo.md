# 여름 책 팔레트 (Summer Book Palette) — 구현 Plan

> 독서모임 웹사이트에 "여름 책 팔레트" 기능을 추가한다.
> 팔레트 칸마다 주제가 있고, 칸별로 사진을 첨부할 수 있으며, 완성하면 팔레트를 저장할 수 있다.

---

## 0. 먼저 결정이 필요한 정책 (Open Questions)

구현 전에 아래 항목을 확정해야 한다. 본 문서는 각 항목에 **MVP 기본값(가정)**을 두고 작성했으며, 답변에 따라 수정한다.

| # | 결정 사항 | 확정 | 비고 |
|---|-----------|------|------|
| Q1 | **팔레트 크기 / 주제 개수** | ✅ 3×3 (9칸), **9칸 모두 주제** | FREE 칸 없음. 현재 7개 주제 + 추가 2개 필요 |
| Q2 | **"완성"의 정의** | ✅ **9칸 모두 완료** | 한 줄(라인) 완성은 시각적 강조하되, 저장·완성 기준은 9칸 전부 |
| Q3 | **"저장"의 의미** | ✅ **서버 진행 저장 + PNG 이미지 다운로드/공유** | 로그인 사용자별 저장 |
| Q4 | **로그인/사용자별 저장** | ✅ 필요 | Supabase DB에 사용자별 팔레트 저장, localStorage는 백업 |
| Q5 | **로그인/사용자별 저장** | 필요 (같은 계정이면 기기 간 복원) | 비로그인 상태는 브라우저 localStorage 백업만 |
| Q6 | **칸당 사진** | 사진 1장 | 여러 장 허용할지 |
| Q7 | **주제 편집/셔플** | 주제는 고정 프리셋 | 사용자가 칸 텍스트 수정·셔플 허용은 Phase 3 |
| Q8 | **운영 기간** | 상시 (여름 시즌 한정 노출은 후순위) | 시즌 배너/마감일 필요 여부 |

> 위 기본값으로 진행해도 무방하면 그대로, 바꿀 항목만 알려주면 해당 섹션을 갱신한다.

---

## 1. 개요 / 목표

- 독서모임 멤버가 "여름 독서"를 주제로 한 팔레트를 채우며 여름 독서 활동을 인증·기록한다.
- 각 칸의 미션을 수행하고 **사진을 첨부**하면 칸이 완료된다.
- 완성한 팔레트를 **이미지로 저장/공유**해 모임 안에서 자랑하거나 SNS에 올릴 수 있다.

성공 기준(MVP):
1. 멤버가 9칸짜리 팔레트에서 각 칸에 사진을 첨부할 수 있다.
2. 로그인한 멤버의 진행 상태가 서버에 저장되어 다른 기기에서도 복원된다.
3. 완성된 팔레트를 PNG 한 장으로 내려받을 수 있다.

---

## 2. 용어 정의

- **팔레트(Board)**: 3×3 격자 전체.
- **칸(Cell)**: 격자의 한 칸. `theme`(주제) 또는 `free`(무료 완성).
- **완료(Filled)**: 사진이 첨부된 주제 칸, 또는 FREE 칸.
- **라인(Line)**: 가로 3 / 세로 3 / 대각 2 = 총 8개.
- **저장(Save/Export)**: 팔레트를 PNG 이미지로 출력.

---

## 3. 기능 요구사항 (FR)

- **FR-1** 팔레트 페이지 진입 시 고정 주제로 3×3 판을 렌더링한다.
- **FR-2** 진입 시 로그인 사용자의 서버 저장 상태를 복원하고, 없으면 localStorage 백업을 복원한다.
- **FR-3** 칸을 탭하면 편집 시트(모달/바텀시트)가 열린다.
- **FR-4** 편집 시트에서 사진을 첨부(갤러리 선택 또는 카메라 촬영)할 수 있다.
- **FR-5** 사진 첨부 시 칸은 "완료" 상태로 바뀌고 썸네일과 체크 표시가 보인다.
- **FR-6** 칸의 사진을 교체/삭제할 수 있다. 삭제 시 완료 상태가 해제된다.
- **FR-7** 사진에는 `MM.DD.hh.MM` 형식의 타임스탬프를 남긴다.
- **FR-8** 라인이 완성되면 라인을 시각적으로 강조한다. 9칸 모두 완료 시 축하 피드백을 보여준다.
- **FR-9** "팔레트 저장" 버튼으로 현재 판 전체를 PNG로 다운로드한다. (9칸 모두 완료했을 때만 다운로드 가능, 미완성 클릭 시 안내 alert)

---

## 4. 데이터 모델

```ts
type CellType = 'theme'; // FREE 칸 없음: 모든 칸이 주제

interface CellPhoto {
  dataUrl: string;   // base64 data URL (이미지 export·복원 위해 objectURL 대신 base64 사용)
  fileName?: string;
  width: number;
  height: number;
}

interface BingoCell {
  id: string;
  index: number;        // 0~8 (좌상단부터 행 우선)
  type: CellType;
  title: string;        // 주제 텍스트 (FREE는 "FREE")
  photo?: CellPhoto;
  completedAt?: string; // ISO 8601
}

interface BingoBoard {
  id: string;
  title: string;        // "여름 책 팔레트"
  size: 3;
  cells: BingoCell[];   // length 9
  createdAt: string;
  updatedAt: string;
}
```

> **중요**: 사진은 반드시 **base64 data URL**로 보관한다. `URL.createObjectURL`로 만든 blob URL은 ① 새로고침 후 무효화되어 복원이 안 되고, ② canvas로 export 시 tainting 문제가 생길 수 있다.

---

## 5. 핵심 로직

```ts
// 칸 완료 여부 (모든 칸이 주제이므로: 사진이 있으면 완료)
const isCellFilled = (cell: BingoCell) => Boolean(cell.photo);

// 8개 라인 인덱스
const LINES: number[][] = [
  [0,1,2],[3,4,5],[6,7,8],   // 가로
  [0,3,6],[1,4,7],[2,5,8],   // 세로
  [0,4,8],[2,4,6],           // 대각
];

const getCompletedLines = (board: BingoBoard) =>
  LINES.filter(line => line.every(i => isCellFilled(board.cells[i])));

const isBingo = (board: BingoBoard) => getCompletedLines(board).length > 0;

// 전체 채움 (9칸 모두 완료 = 완성)
const isFullClear = (board: BingoBoard) =>
  board.cells.every(isCellFilled);
```

---

## 6. UI / UX 흐름

1. **진입**: 팔레트 페이지 → 저장된 진행 복원 → 3×3 격자 표시.
2. **칸 탭**: 편집 시트 오픈 (주제 제목, 사진 첨부 영역, 삭제).
3. **사진 첨부**: 갤러리 선택 또는 카메라(`capture`) → 타임스탬프 각인 → 미리보기 → 확인 시 칸 완료.
4. **완료 표시**: 칸에 썸네일 + 체크 오버레이.
5. **팔레트 완성**: 9칸을 모두 채우면 가벼운 축하 연출(토스트/컨페티).
6. **저장**: 하단 고정 "팔레트 저장" 버튼 → PNG 다운로드 (+ 공유 옵션).

**모바일 고려**
- 카메라 촬영: `<input type="file" accept="image/*" capture="environment">`
- 편집 UI는 바텀시트 권장.
- 격자는 정사각 비율 유지(`aspect-ratio: 1`), 터치 타깃 충분히 크게.

---

## 7. 팔레트 이미지 저장(Export) 방안

- 라이브러리: **`html-to-image`**(`toPng`) 권장 (또는 `dom-to-image-more`). `html2canvas`는 대체안.
- 절차:
  1. 보드 DOM에 export 전용 ref 부여.
  2. 폰트·이미지 로딩 완료 후 `toPng(node, { pixelRatio: 2 })` 호출.
  3. 반환된 dataURL을 `<a download>`로 다운로드.
  4. (선택) Web Share API(`navigator.share`)로 파일 공유.
- 주의:
  - 모든 이미지가 base64여야 깨지지 않는다(§4).
  - 커스텀 폰트는 export 전 `document.fonts.ready` 대기.
  - 캡처용 레이아웃을 별도 컨테이너로 두면(화면 표시용과 분리) 여백·해상도 통제가 쉽다.

---

## 8. 영속화(Persistence) — MVP

- 로그인한 승인 회원의 진행 상태를 **Supabase `summer_bingo_boards`**에 사용자별 JSON으로 저장한다.
- localStorage는 서버 저장 실패/비로그인 상태를 위한 브라우저 백업으로 유지한다. (키 예: `summer-book-bingo:v1`)
- 저장 시점: 칸 변경(디바운스) 시 서버와 localStorage에 동시 저장.
- **용량 관리**: localStorage는 ~5MB 제한. 사진 base64는 용량이 크므로 **업로드 시 리사이즈/압축** 필수.
  - canvas로 최대 변(예: 1024px)에 맞춰 다운스케일 후 `toDataURL('image/jpeg', 0.8)`.
  - quota 초과 시 사용자 안내 + 가장 오래된 사진부터 정리 옵션.
- 사진은 현재 리사이즈된 base64 data URL을 보드 JSON에 포함해 저장한다. 용량이 커지면 Supabase Storage 분리 저장으로 전환한다.

---

## 9. 컴포넌트 구조 (React + TypeScript 가정)

```
features/summer-bingo/
├─ SummerBingoPage.tsx
├─ components/
│  ├─ BingoBoard.tsx          // 3×3 격자
│  ├─ BingoCellItem.tsx       // 개별 칸 (썸네일/체크/제목)
│  ├─ CellEditSheet.tsx       // 사진 첨부 바텀시트
│  ├─ PhotoUploader.tsx       // 파일/카메라 입력 + 미리보기
│  ├─ SaveBoardButton.tsx     // PNG export·공유
│  └─ BingoCelebration.tsx    // (선택) 라인 완성 연출
├─ hooks/
│  ├─ useBingoBoard.ts        // 보드 상태 + localStorage 동기화
│  ├─ useImageExport.ts       // html-to-image 래퍼
│  └─ useImageResize.ts       // 업로드 이미지 리사이즈/압축
├─ lib/
│  ├─ bingoLogic.ts           // LINES, isCellFilled, getCompletedLines 등
│  └─ storage.ts              // load/save (버전·quota 처리)
├─ data/
│  └─ themes.ts               // 고정 주제 프리셋
└─ types.ts
```

---

## 10. 주제 프리셋 (9칸 확정)

**최종 9개 주제:**
1. 수박 주스 마시면서 책 읽기
2. 여름 제철 책 읽기
3. 책에서 '여름' 단어 발견하기
4. 바다가 생각나는 음악 추천하기
5. 여름밤의 공기를 느끼며 산책하기
6. 여름 하늘 구경하기
7. 여름과 잘 어울리는 문장 발견하기
8. 좋아하는 여름 간식과 책 사진 함께 찍기
9. 여름 휴가지/여행 중에 책 읽기

---

## 11. 구현 단계 (Phases)

**Phase 1 — MVP**
- 고정 3×3 보드 렌더링, 칸별 사진 첨부/삭제, 업로드 이미지 리사이즈.
- 서버 진행 저장/복원 + localStorage 백업.
- "팔레트 저장"(PNG 다운로드).

**Phase 2 — 팔레트 경험 강화**
- 라인 완성 감지 + 하이라이트 + 축하 연출.
- 완료 진행률 표시.
- 공유(Web Share API).

**Phase 3 — 확장 (백엔드/소셜)**
- 계정 연동 + 서버 저장, 모임 갤러리(다른 멤버 팔레트 구경).
- 주제 셔플/커스텀, 시즌(여름) 한정 노출·마감일.

---

## 12. 테스트 시나리오 (Vitest + React Testing Library)

- 주제 칸: 사진 첨부 시 `completed` 상태로 전환된다.
- 라인 감지: 가로/세로/대각 각각 3칸이 모두 채워지면 완성 표시된다. (단, 전체 9칸이 채워져야 최종 완성)
- 전체 채움(완성): 9칸 모두 사진이 첨부되면 `isFullClear`가 true, 축하 연출 발동.
- 9칸 미완료: 8칸만 채우고 저장 버튼을 누르면 "완성 시 다운로드 가능합니다" alert가 표시된다.
- 사진 삭제: 완료 해제되고 관련 라인 표시도 해제된다.
- 영속화: 저장 후 재마운트 시 보드 상태가 복원된다.
- quota 초과: 저장 실패를 감지하고 사용자 안내 경로를 탄다.
- 리사이즈: 큰 이미지 업로드 시 최대 변/포맷/용량이 기대치 이하로 줄어든다.
- export: `toPng`가 보드 노드로 호출되어 완성된 팔레트 이미지가 생성된다.

---

## 13. 엣지 케이스 / 주의

- **대용량/고해상도 이미지** → 업로드 즉시 리사이즈(§8).
- **iPhone HEIC 포맷** → 일부 브라우저 미리보기/캔버스 미지원. 변환 필요 여부 확인(플래그).
- **localStorage quota 초과** → 명확한 안내 + 정리 옵션.
- **blob URL tainting** → 사진은 base64로만 보관(§4).
- **폰트/이미지 로딩 타이밍** → export 전 로딩 대기.
- **미완성 판 저장 차단** → 9칸이 모두 채워질 때까지 다운로드 대신 안내 alert를 표시.
- **접근성** → 칸 버튼에 aria-label(주제명+완료 여부), 키보드 포커스.

---

## 14. 비범위 (Out of Scope, MVP)

- 실시간 멀티유저 동시 편집.
- 비로그인 사용자의 서버 저장.
- 랭킹/경쟁 요소.
- 주제 자동 추천/생성.

---

## 15. 기술 메모

- 스택: React + TypeScript (Vite 기반 가정).
- 권장 라이브러리: `html-to-image`(export). 상태는 로컬 컴포넌트/훅으로 충분, 전역 스토어 불필요.
- 이미지 리사이즈는 `<canvas>`로 직접 처리(외부 의존 최소화).
- 폴더/네이밍은 기존 프로젝트 컨벤션에 맞춰 조정.

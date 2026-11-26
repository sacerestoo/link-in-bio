# #79 Bento 아이템 저장 모델과 일괄 저장 설계

## 목표

`bento_items` 저장, 원자적 일괄 저장, 편집기의 명령 기반 자동 저장을 새 저장소의
경계에 맞춰 설계한다. 이전 구현은 동작 참고용이다. UI 문구와 배치는 필요할 때만
참고하고, 책임과 데이터 흐름은 아래 설계를 따른다.

## 기존 구현에서 확인한 문제

1. **저장 유스케이스에 규칙과 영속성이 과밀하다.**
   `grabbin_old/apps/server/src/services/page-item.service.ts`의 배치 저장은
   입력 파싱, 중복 ID와 소유권, 플랜 판정, 타입별 미디어 키 검사, 전체 레이아웃
   검사, 미디어 상태 변경, 삭제·upsert, 응답 변환을 한 트랜잭션 함수에 모은다.
   이 함수는 약 220줄이며 실패 규칙을 바꿀 때 영향 범위가 넓다.
2. **편집기 훅이 여러 상태의 소유자다.**
   `grabbin_old/apps/web/src/features/page/editor/hooks/use-bento-store.ts`는
   671줄이고, 드래프트·저장 기준선·명령 반영·자동 저장 큐·응답 병합·미디어
   업로드 취소·blob URL 정리·링크 메타데이터·분석 이벤트·토스트를 함께 관리한다.
   리듀서만 순수해도 비동기 수명주기와 저장 정책은 훅 한 곳에 다시 모여 있다.
3. **링크 미리보기가 저장을 직접 수행한다.**
   `grabbin_old/apps/server/src/services/link-metadata.service.ts`는 외부
   HTML/provider 조회 뒤 `page_items`를 직접 갱신한다. 자동 저장과 별도 경로가
   같은 아이템을 수정하므로 URL 변경과 늦은 응답의 경합을 각 호출자가 막아야
   한다.
4. **미지 타입은 응답 계약에서 소실된다.** 이전 `packages/api/src/grid.ts`의
   `PageItemResponse`는 9개 알려진 타입만 strict variant로 받는다. 새 저장소의
   `packages/shared/src/schemas/bento-layout.ts`에는 이미 9개 타입과 미지 타입용
   레이아웃 기본값이 있지만, 아이템 응답의 미지 타입 데이터 보존은 아직 별도
   계약이 필요하다.
5. **전역 ID 충돌 때 페이지 소유 범위가 쓰기 조건에 없다.** 이전 배치 경로는
   전역 기본 키에 `ON CONFLICT DO UPDATE`한다. upsert와 delete 모두 `page_id`
   범위로 실행해 다른 페이지의 항목을 갱신하거나 삭제하지 못하게 해야 한다.
6. **옛 패키지 경계는 새 저장소에 맞지 않는다.** 이전
   `packages/application/src/media-assets.ts`는 DB를 직접 가져온다. 새 저장소는
   DB를 `apps/server`와 `apps/cron`에서만 접근하게 하고, 등록되지 않은
   `packages/application` 추가도 허용하지 않는다.

## 책임 배치

| 영역                                                            | 소유할 책임                                                                                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/schemas/bento-layout.ts`                   | 기존 wide 4열·compact 2열, 9개 타입, 프리셋, 미지 타입 기본값과 결정적 충돌 재배치를 한 규칙으로 유지                                         |
| `packages/shared/src/schemas/bento-item.ts`                     | 타입별 데이터·스타일·응답·일괄 요청/응답 계약과 추론 타입. DB 의존성 없음                                                                     |
| `packages/shared/src/schemas/page.ts`                           | 페이지 응답과 페이지 전체 저장 요청을 정의. 저장 요청은 변경된 page 필드와 선택적 `bento` batch를 함께 받음                                   |
| `packages/db/src/schema/bento-items.ts`                         | Bento 아이템 테이블과 관계. `type`은 text, `data`·`style`·`layouts`는 JSONB                                                                   |
| `packages/db/src/schema/bento-media-assets.ts`                  | 업로드 예약 ID, object key, `pending → attached → pending_delete` 상태, URL 만료와 7일 보관 시각. 같은 예약 ID의 재요청은 같은 자산 행을 사용 |
| `apps/server/src/routes/pages.route.ts`                         | 기존 페이지 경로와 응답을 유지하고, 인증·입력 검증·상태 코드 변환 담당                                                                        |
| `apps/server/src/services/pages.service.ts`                     | 페이지 스냅샷 조회와 페이지 전체 저장 트랜잭션 조정. page 필드와 Bento 저장을 조합                                                            |
| `apps/server/src/services/pages.repository.ts`                  | 호출자가 건넨 transaction으로 page의 수정 가능한 필드를 저장                                                                                  |
| `apps/server/src/services/bento.service.ts`                     | 전달받은 transaction 안에서 순수 Bento 정책과 저장 함수를 조합                                                                                |
| `apps/server/src/services/bento.repository.ts`                  | 페이지 스코프 벌크 변경 SQL 함수. 호출자가 건넨 DB/트랜잭션에서 동작                                                                          |
| `apps/server/src/lib/bento-batch-policy.ts`                     | DB에 의존하지 않는 net-diff 적용, 중복 검사, 최종 스냅샷 구성                                                                                 |
| `apps/server/src/services/bento-media-assets.service.ts`        | 트랜잭션에 참여하는 미디어 등록·첨부·삭제 예약. R2 직접 삭제는 하지 않음                                                                      |
| `apps/server/src/services/bento-media.service.ts`               | 파일 타입/크기 확인, 반복해도 같은 예약을 쓰는 presigned URL 발급, 불명확한 업로드 확인, 아이템 저장 시 R2 `HEAD` 검사                        |
| `apps/server/src/services/bento-link-preview.service.ts`        | HTTPS 링크의 제한된 HTML 조회와 표준 메타데이터 반환. DB 쓰기 없음                                                                            |
| `apps/web/features/page/api.ts`, `queries.ts`                   | handle 페이지 스냅샷 조회와 페이지 전체 저장 API                                                                                              |
| `apps/web/features/page/hooks/use-page-autosave.ts`             | page 필드와 Bento 변경을 모으는 단일 1.5초 debounce와 저장 요청 소유자                                                                        |
| `apps/web/features/bento/api.ts`                                | 미디어 업로드·링크 preview 호출. Bento batch 저장은 page 저장 API가 담당                                                                      |
| `apps/web/features/bento/commands.ts`, `reducer.ts`, `batch.ts` | 순수 명령, 드래프트 변경, 저장 기준선과 현재 상태의 net diff 계산                                                                             |
| `apps/web/features/bento/hooks/`                                | Bento 편집과 비동기 업로드 상태. 페이지 전체 저장 큐는 소유하지 않                                                                            |
| `apps/web/features/page/ui/indicator.tsx`                       | 페이지 저장 라우트에서 전달받은 문구 하나만 표시. page 필드와 Bento를 구분하지 않으며 문구·저장 상태를 내부에서 정하지 않음                   |

`apps/web/app/[handle]/page.tsx`가 page snapshot query를 한 번 호출하고
`profile`과 `bento` UI에 필요한 props를 나눠 전달한다. `profile` feature의 `/me`
조회는 프로필 설정 화면만 사용한다. 웹 feature끼리는 서로 import하지 않는다. 새
공용 패키지는 만들지 않는다. 작은 모듈을 조합하는 방식은 참고하되,
`packages/db`를 schema/client/migration 전용으로 두고 DB 접근을 server에
제한하는 Grabbin 규칙을 유지한다.

## OpenAnalytics에서 취할 모듈 원칙

- 순수 결정은 I/O 없는 작은 정책 함수로 둔다. 예를 들어 OpenAnalytics의
  [`ownership.ts`](https://github.com/OpenLabs-so/openanalytics/blob/main/packages/domain/src/ownership.ts)는
  재인증 시간 규칙만 판단한다.
- DB 함수는 명시적인 컬럼과 tenant/page 조건을 가진 작은 연산으로 나눈다.
  [`widgets.ts`](https://github.com/OpenLabs-so/openanalytics/blob/main/packages/postgres/src/repositories/widgets.ts)는
  목록, 단건 조회, 개수 조회와 공개용 join을 별도 함수로 제공한다.
- DB 함수는 DB 또는 트랜잭션을 입력으로 받아 더 큰 원자 작업 안에서 합성할 수
  있게 한다. OpenAnalytics의
  [`Executor`](https://github.com/OpenLabs-so/openanalytics/blob/main/packages/postgres/src/client.ts)는
  이 조합 지점을 명시한다.
- HTTP 경로는 정책과 DB 함수를 조립한다. OpenAnalytics의
  [`widgets.ts` route](https://github.com/OpenLabs-so/openanalytics/blob/main/apps/api/src/http/widgets.ts)처럼
  인증과 검증 뒤 필요한 연산만 호출한다.

Grabbin에서는 같은 원칙을 적용하되, OpenAnalytics의 `packages/postgres`처럼
repository 계층을 새 workspace package로 옮기지 않는다. 프로젝트 규칙상 테이블
schema는 `packages/db`에, SQL 접근과 트랜잭션 조합은
`apps/server/src/services/`에 둔다.

## 계약과 저장 모델

- 알려진 타입은 `text`, `section`, `media`, `map`, `link`, `calendly`, `rss`,
  `spotify`, `tweet` 9개다. 본 이슈의 직접 편집 대상은 `text`, `section`,
  `media`, `map`, `link` 5개와 미지 타입의 안전한 레이아웃 편집이다. 나머지
  알려진 위젯은 데이터와 레이아웃을 보존하며 provider별 기능은 후속 단계로 둔다.
- 테이블은 `id`, `page_id`, `type`, `data`, `style`, `layouts`, `created_at`,
  `updated_at`을 가진다. `page_id`에는 페이지 FK와 조회 인덱스를 둔다. 타입을 DB
  enum으로 고정하지 않아 이후 타입을 읽고 보존할 수 있게 한다.
- 알려진 타입의 입력은 `type`별 discriminated schema로 엄격히 검사한다. URL은
  HTTPS만 허용한다. `layouts`는 기존 공용 레이아웃 계약에 따라 wide와 compact
  각각의 허용 프리셋, 경계, 겹침을 검사한다.
- 읽기 응답은 알려진 타입별 검증과 불투명 미지 타입 검증을 모두 지원한다. 미지
  타입은 JSON 객체 데이터와 공통 스타일·레이아웃을 보존하고 기본 카드로
  표시한다. 미지 타입의 신규 생성과 데이터 수정은 거부하되, 기존 항목의
  위치·크기 변경과 삭제는 허용한다.
- 클라이언트가 보내는 항목 ID는 UUID 형식으로 제한한다. 요청 본문은 `pageId`나
  `userId`를 받지 않는다. 서버는 경로의 handle과 세션 사용자로 소유 페이지를
  결정한다. 저장 시 항목 타입은 변경하지 않는다.

## 페이지 전체 저장 API

- `GET /pages/:handle`은 `pageResponseSchema`에 맞춰 page 필드와 `bento` 아이템
  배열을 한 응답으로 반환한다. DB는 명시한 컬럼만
  `pages LEFT JOIN bento_items`로 읽고 `created_at, id` 순으로 정렬한 뒤,
  server에서 행을 page 1개와 `bento` 배열로 묶는다. 아이템이 0개여도 page를
  반환한다. 이 경로에서는 페이지 조회와 Bento 조회를 별도 query로 나누지 않는다.
- `GET /pages/me`는 프로필 푸터의 내 페이지 링크용으로 유지하며, Bento 없이
  프로필 필드만 반환한다. handle 페이지와 Bento 항목은 `GET /pages/:handle`로
  함께 조회하며, Bento 편집용 별도 조회 API를 추가하지 않는다.
- join 결과는 page 컬럼이 아이템 수만큼 반복되지만, 페이지 데이터가 작고 아이템
  수가 제한된 편집 도메인에서는 두 번째 DB 왕복보다 단순하다. 공개 응답은 명시적
  projection으로 `userId` 등 내부 컬럼을 제외한다.
- `PATCH /pages/:handle`은 페이지 전체 저장 API다. 본문은 변경된 page 필드와
  선택적 Bento batch를 함께 담는다:
  `{ page?: { name?, bio? }, bento?: { upserts, deletes } }`. name/bio와 Bento
  변경이 같은 debounce 구간에 있으면 한 요청으로 보낸다. 따로 바뀐 경우에는 바뀐
  쪽만 보낸다. 기존 별도 page 자동 저장 요청과 `PATCH /pages/:handle/batch`를 이
  API로 합친다.
- 성공 응답은 GET과 같은 `pageResponseSchema` 모양으로, 저장된 page와 `bento`
  전체를 돌려준다. Web에서는 `features/page/queries.ts`만 handle 스냅샷을
  query하며, 서버 선조회와 브라우저 query는 같은 query key를 사용한다. 별도
  `useQuery`나 `initialData`를 추가하지 않는다.
- 페이지 전체 autosave는 page snapshot의 saved 기준과 현재 화면 편집본을
  비교한다. Bento는 기존 net-diff로 `{ upserts, deletes }`를 만들고, page는 바뀐
  name/bio만 보낸다. 디바운스 전에 만들었다 지운 항목은 요청에서 빠지고, 저장된
  항목 삭제는 한 번만 `deletes`에 들어간다.
- page 단위 1.5초 debounce 하나만 둔다. page 필드나 Bento가 바뀔 때마다 타이머를
  다시 시작하고, 마지막 변경 뒤 1.5초가 지나면 현재 변경을 합쳐 한 번 보낸다. 한
  handle에서 진행 중인 저장 요청은 하나뿐이다. 요청 중 추가 수정은 화면에 남겨
  두고, 응답으로 전체 saved snapshot을 갱신한 뒤 남은 차이를 다시 계산한다.
- 새 미디어 파일의 바이트 업로드는 R2로 별도 전송한다. 업로드가 확인된 뒤 object
  key를 Bento batch에 넣는다. debounce가 끝났어도 포함된 미디어 업로드가 진행
  중이면 통합 저장 요청은 업로드 확인 뒤 보낸다. 그동안 page 필드와 Bento 변경을
  모아 한 번에 저장한다. 업로드가 실패하면 통합 저장 요청은 보내지 않고 page와
  Bento 편집본을 유지하며 page 상태에 실패 문구를 전달한다. page 필드 수정과
  Bento DB 저장은 한 transaction이라 Bento validation이나 DB 저장이 실패하면 둘
  다 저장되지 않는다. 따라서 통합 저장 요청은 page와 Bento의 DB 저장을 합치지만
  R2 파일 전송까지 합치지는 않는다.
- 서버는 한 transaction에서 소유권을 확인하고 page 필드와 Bento batch를 함께
  저장한다. `page`나 `bento` 중 하나라도 유효하지 않거나 저장에 실패하면 전체를
  롤백한다. 편집기는 요청을 직렬화하므로 오래된 `updatedAt`에 따른
  `CONCURRENT_ITEM_UPDATE` 응답은 두지 않는다.
- 순수 batch 정책이 중복 ID, upsert/delete 교집합, 타입 변경, 잘못된
  데이터·HTTPS URL·프리셋을 검사한다. 하나라도 유효하지 않으면 전체 묶음을
  롤백한다. 잘못된 입력은 검증 오류이지 정상 편집의 충돌 응답이 아니다.
- 최종 전체 레이아웃은 wide·compact 모두 충돌이 없는지 검사한다. 리듀서가 같은
  순수 레이아웃 함수로 편집 중 겹치는 블록을 재배치하고, 서버는 저장 전 전체
  결과를 검증한다. 잘못된 프리셋·범위·겹침은 입력 검증 오류로 거부한다.
- ID는 클라이언트에서 UUID로 한 번 생성해 재시도 때도 유지한다. 다른 page의 ID를
  upsert하면 그 행을 절대 갱신하지 않고 요청을 거부한다. delete는 반드시
  `id + page_id` 조건으로 수행하며 이미 없는 항목은 성공한 삭제처럼 취급한다.
  소유권 선조회와 무조건적 전역 upsert를 함께 쓰지 않는다.
- 현재 이슈에서는 entitlement 잠금과 provider별 link enrichment를 추가하지
  않는다. 각각 P5와 P7의 책임이다.

## 편집기 상태와 자동 저장

저장된 기준선은 handle 페이지 query cache의 page snapshot 전체로 둔다. 화면
편집본은 page의 name/bio와 `bento`를 포함한다. query cache의 값을 화면 편집으로
직접 수정하지 않는다. Bento 명령 리듀서는 `add`, `update-data`, `update-style`,
`apply-preset`, `replace-layout`, `delete`를 동기적으로 적용하고
네트워크·타이머·파일 API를 호출하지 않는다. page save coordinator는 saved
snapshot과 화면 편집본을 비교해 변경된 page 필드와 Bento upsert/delete만 만든다.
드래프트에만 존재한 아이템을 삭제할 때는 delete tombstone을 남기지 않는다.

페이지 autosave가 page 필드와 Bento 변경을 모으는 1.5초 debounce와 진행 중인
요청 최대 1개를 소유한다. 저장 mutation의 `onMutate`는 page query를 취소하고
이전 snapshot을 mutation context에 보관한 뒤, 요청에 포함한 page 필드와 Bento
변경을 query cache에 임시 반영한다. `onError`는 전체 page snapshot을 되돌리고
화면 편집본은 보존한다. 이 설계에서는 실패 응답이면 서버 transaction이 롤백된
것으로 처리한다. 저장 성공 후 응답만 유실되는 경우는 범위에서 제외하고, 실패 뒤
확인 GET도 보내지 않는다. `onSuccess`는 서버가 반환한 전체 page snapshot으로
교체한다. 별도 cache 업데이트 함수를 만들지 않는다. 요청 중 추가 편집은 화면에
계속 반영하고, 응답 뒤 saved snapshot과 화면 편집본의 전체 차이를 다시 계산한다.
실패한 쓰기 요청은 자동·수동으로 재시도하지 않는다. 페이지 저장 라우트의 실패
문구는 상태 담당자가 한 번 정해 indicator에 전달한다. indicator는 받은 문구만
표시한다. 실패 문구는 destructive 색상의 텍스트이며 토스트는 없다. 저장 중
문구와 성공 뒤 숨김도 indicator 바깥에서 정한다. 이후 사용자가 새로 편집하면
현재 변경분을 새 저장 요청으로 보낸다.

미디어 파일 업로드는 아이템 저장과 별도 단계다. 편집기는 선택한 파일과
`uploadId`, 업로드 상태를 로컬에 보관한다. 업로드가 확인된 뒤에는 드래프트
아이템에 같은 `objectKey`를 넣는다. 아이템 저장이 실패해 query cache가
되돌아가도 R2 업로드는 되돌릴 수 없으므로 업로드 상태는 그대로 둔다. 같은 파일의
업로드를 다시 하지 않는다. 업로드 결과가 불분명한 경우에만 같은 `uploadId`로
예약 API를 다시 호출해 서버가 R2 상태를 확인하게 한다. 화면 편집본은 브라우저
메모리에만 둔다. 새로고침하면 미저장 편집은 버리고 서버에 저장된 page와
`bento`를 다시 읽는다. 로컬 저장이나 새로고침 경고는 제공하지 않는다.

페이지 query key와 저장 요청에 handle을 넣는다. A 페이지의 늦은 응답은 A 캐시만
갱신하므로 B 페이지 데이터와 섞이지 않는다. 별도 페이지 전환 동기화 상태는 두지
않는다. 분석 이벤트는 페이지 저장 라우트 결과 경계에서만 실행한다. page 상태
담당자는 같은 handle의 단일 저장 상태만 indicator에 전달한다. page 필드인지
Bento인지 indicator는 구분하지 않는다. indicator는 문구·색상·표시 시점을
내부에서 정하지 않는다. 알림 처리는 reducer나 diff 계산에 넣지 않는다.

## 미디어와 링크 흐름

**미디어:** Bento는 GIF, JPEG, PNG, MP4, WebM, MOV 파일을 지원하며 파일 크기는 5
MB 이하로 제한한다. 브라우저는 파일 하나를 고를 때 안정된 `uploadId`를 한 번
만들고, 업로드 예약 재시도에도 같은 ID를 보낸다. 서버는 그 ID로 `pending` 자산
행과 object key를 한 번만 만들며, 같은 ID가 다시 오면 새 행/key 대신 기존 것을
사용한다. 이 ID는 DB에서 유일하게 제한한다. 같은 업로드 URL 발급 API를 같은 ID로
다시 부르면 서버는 기존 key를 `HEAD`한다. object가 있으면 `uploaded`로 답하고
URL을 다시 주지 않는다. 없으면 `status = pending`인 예약에 한해 같은 key로
조건부 PUT URL을 다시 발급하고 URL 만료 시각과 `cleanupAfter`를 갱신한다.
`pending_delete`로 넘어간 예약은 되살리지 않는다. 시간 갱신과 상태 확인은 조건부
DB 변경으로 cron 정리와 경합하지 않게 한다. `HEAD`가 실패하면 URL을 발급하지
않고, 확인 후 다시 시도하게 한다. 그래서 정상 경로에는 별도 업로드 완료 API가
없다. 업로드 URL은 `If-None-Match: *` 조건을 포함해 해당 key에 object가 이미
있으면 덮어쓰지 못하게 한다. 브라우저 PUT에 쓰는 `Content-Type`과
`If-None-Match`는 R2 CORS 허용 헤더에 포함한다. 업로드 취소는 브라우저 전송을
중단하는 최선의 시도일 뿐, 이미 R2에 저장된 object를 되돌리지는 않는다. 아이템
batch가 해당 키를 참조하면 서버가 R2 `HEAD`로 존재 여부·크기·MIME을 확인하고,
같은 DB 트랜잭션에서 아이템을 저장하며 자산 행을 `attached`로 바꾼다. 연결은
행이 `pending`이고 cron의 정리 상태 변경보다 먼저 이길 때 허용한다. 업로드 URL이
만료됐더라도 이미 올라간 object는 정리 작업이 시작되기 전에 연결할 수 있다. URL
만료는 새 PUT을 막는 시각이고, 미사용 예약 정리는 별도의 `cleanupAfter` 시각에
시작한다. 최종 저장된 Bento에서 더는 참조하지 않는 첨부 미디어는 DB 트랜잭션에서
`pending_delete`로 바꾼다. SQL 커밋 전 R2 삭제는 하지 않는다. 주 1회 미디어 정리
작업은 미사용 예약의 `cleanupAfter`가 지난 경우 `pending → pending_delete`를
조건부로 바꾸고, 삭제 대상 key도 먼저 `pending_delete`로 확정한 다음 R2 object를
지운다. 삭제 실패나 결과 불명 시 행을 남겨 같은 object key로 재시도한다. R2에
object가 이미 없으면 삭제 성공으로 보고 행을 정리한다. URL 만료 뒤 늦게 완료된
PUT으로 DB 기록이 제거된 뒤 object가 생기는 경우에 대비해, 별도 저빈도 정리
작업이 Bento prefix의 object key와 `last_modified`를 DB 자산 기록과 대조한다.
하지만 나이와 DB 행 부재만으로 미저장 드래프트가 끝났다고 증명할 수는 없다. R2
목록은 파일의 마지막 변경 시각은 알려줘도 브라우저가 아직 그 파일을 드래프트에서
쓰는지는 모르기 때문이다. 별도 편집기 heartbeat나 무기한 보호는 두지 않는다.
업로드 URL이 만료된 뒤 7일이 지나면 예약을 정리 대상으로 삼고, 주 1회 작업에서
R2 파일과 예약 기록을 함께 정리한다. 이 기간이 지나도록 저장하지 않은 드래프트는
미디어 파일을 다시 올려야 한다. 기록 없는 늦은 업로드는 `last_modified`가
7일보다 오래됐을 때만 고아 파일로 삭제한다. 따라서 R2 나이만으로 판단하지 않고,
예약의 만료와 기록 유무도 함께 확인한다.

### 미디어 실패와 재시도

- 업로드 예약 행 생성이 실패하면 서버는 presigned URL을 반환하지 않는다. 따라서
  이 요청으로 시작된 R2 업로드는 없다. 예약 행은 만들어졌지만 URL 서명이나 응답
  전송이 실패하면 R2 업로드는 시작되지 않고 `pending` 행만 남아 만료 정리된다.
  같은 `uploadId` 재요청은 같은 행을 사용한다.
- 예약 요청 응답이 유실돼도 브라우저가 같은 `uploadId`로 다시 요청하면 같은 자산
  행과 object key를 받는다. 새 예약이나 새 object key를 만들지 않는다.
- 아이템 저장이 실패하면 업로드 단계는 다시 실행하지 않는다. 업로드가 확인된
  object key와 화면 편집본을 유지하고, 실패한 저장 요청도 다시 보내지 않는다.
- R2 `PUT` 응답이 실패하거나 유실돼 성공 여부를 모르면 즉시 다시 올리지 않는다.
  같은 업로드 URL 발급 API를 같은 예약 ID로 다시 호출한다. 서버가 같은 object
  key를 `HEAD`해 object가 있으면 업로드 완료로 답하고, 없으면 조건부 PUT URL을
  같은 key로 다시 발급한다. 확인 자체가 실패하면 URL을 발급하지 않고 업로드를
  보류한다. `HEAD`가 없다고 답해도 이전 PUT이 아직 진행 중일 수 있으므로
  그것만으로 이전 요청의 실패를 확정하지 않는다.
- 재전송이 필요하면 같은 object key에 `If-None-Match: *` 조건을 붙인다. R2는
  조건을 object 저장 시점에 원자적으로 검사하므로 같은 key에 object가 있는 동안
  다른 PUT이 덮어쓰지 못한다. 다른 요청이 `412 PreconditionFailed`를 받으면 같은
  key를 다시 `HEAD`하고, 확인된 object를 기존 업로드의 결과로 사용한다. 새 key를
  만들지 않으므로 같은 업로드 예약으로 R2 object가 중복 생성되지 않는다. 다만
  정리 작업이 key를 삭제한 뒤 아주 늦은 PUT이 끝나면 object가 다시 생길 수
  있으므로 prefix 정리 작업이 이를 찾아 제거한다.
- 업로드 상태는 `uploaded / unknown / missing`으로 구분한다. `unknown`일 때 확인
  자체가 실패하면 재전송하지 않는다. 확인 결과 object가 없으면 같은 key의 조건부
  PUT만 허용한다. 이 보장은 별도 object/예약을 만들지 않는다는 뜻이다. 응답 유실
  때 네트워크가 실제로 전송한 바이트를 정확히 한 번으로 제한하는 것은 보장하지
  않는다.
- R2 `PUT` 실패 또는 브라우저에서 취소를 눌러도 `pending` 행은 남고 아이템
  batch를 보내지 않는다. 포기한 업로드는 URL 만료와 유예 시간이 지난 뒤 cron이
  object가 있으면 지우고, 없으면 기록만 정리한다.
- R2 `HEAD` 또는 batch 입력 검증이 실패하면 DB 저장 트랜잭션을 시작하지 않는다.
  아이템과 자산 행은 그대로이며 저장 요청을 자동으로 다시 보내지 않는다.
- DB 트랜잭션 안에서 아이템 저장이나 `pending → attached` 중 하나라도 실패하면
  둘 다 롤백된다. 업로드된 R2 object와 `pending` 행은 남는다. 실패한 batch를
  재시도하지 않으며, 이후 새 편집으로 저장할 때 기존 object key를 사용한다.
- 삭제 batch 트랜잭션에서 아이템 삭제나 미디어 상태 변경 중 하나라도 실패하면 둘
  다 롤백되고 R2 삭제는 시작하지 않는다. 저장 API는 R2 `DELETE`를 직접 호출하지
  않는다.
- 별도 cron만 `pending_delete` object를 지운다. R2 삭제 결과가 유실되면 cron은
  같은 key를 다시 삭제할 수 있다. 이미 없는 object도 성공으로 취급하므로 파일
  삭제 효과가 중복되거나 저장 요청과 섞이지 않는다. R2 삭제 후 DB 행 정리가
  실패하면 다음 cron 실행이 같은 방식으로 마무리한다.
- 미사용 예약 정리와 첨부 저장의 경합은 상태 전이 조건으로 막는다. cron은
  `cleanupAfter`가 지난 `pending` 행을 조건부로 `pending_delete`로 바꾸고,
  batch는 `pending → attached`를 조건부로 바꾼다. 한쪽 전이만 성공할 수 있다.
  R2에서 object를 지운 뒤 DB 행을 정리했더라도 늦은 PUT이 나중에 완료될 수
  있으므로, prefix 정리 작업은 DB 자산 기록이 없는 오래된 object를 다시 찾아
  삭제한다.

**링크:** 붙여넣기 즉시 HTTPS URL을 드래프트에 반영하고 별도 preview 요청으로
일반 HTML의 제목·설명·이미지·파비콘을 가져온다. 서버는 제한된 바이트/시간, HTTPS
redirect 재검증, HTML 메타데이터 추출을 담당하고 DB에는 쓰지 않는다. 응답은 요청
당시 URL과 현재 드래프트 URL이 같은 경우에만 reducer 명령으로 반영한다.
metadata는 다음 batch 저장에 포함된다. provider별 보강은 제외한다.

## 작은 모듈을 만드는 순서

한 번에 큰 기능을 만들지 않는다. **테스트 코드로 모듈의 역할과 협력 관계를 먼저
정하고, 그 기대를 만족시키는 코드를 만든 뒤 다음 모듈과 연결한다.** 여기서
객체는 클래스에 한정하지 않는다. Grabbin 코드에서는 함수나 서비스 모듈도 역할을
맡는다.

각 모듈의 테스트에는 먼저 세 가지를 적는다.

1. **받는 요청:** 이 모듈에 어떤 입력이나 호출이 오는가.
2. **돌려줄 결과:** 성공하거나 실패할 때 호출자에게 무엇을 돌려주는가.
3. **협력할 상대:** 결과를 만들기 위해 어떤 다른 모듈에 무엇을 요청하는가.

예를 들어 page 저장 서비스는 page와 Bento 변경 요청을 받고, 저장된 전체 page
결과를 돌려준다. 테스트는 이 서비스가 page 저장과 Bento 저장 모듈에 **같은 DB
transaction** 안에서 일을 요청하는지, Bento 저장이 실패하면 전체 저장이
취소되는지를 확인한다. 이 기대가 서비스와 저장 모듈의 책임 경계를 정한다.

그 다음 테스트를 먼저 실행해 의도한 이유로 실패하는지 확인하고, 통과에 필요한
최소 코드를 만든다. 통과 후 코드를 정리하고 다시 확인한다. 테스트는 내부 코드
모양을 고정하는 대신 모듈 사이에 주고받는 요청·결과·협력을 확인한다. 순수한
계산은 단위 테스트로, 서비스의 DB 작업은 좁은 범위의 서버 테스트로 확인한다.
컴포넌트 테스트와 E2E 테스트는 작성하지 않는다. UI 연결은 타입 검사와 수동
확인으로 마무리한다.

## 구현 순서와 완료 확인

1. **Bento 데이터 모양** — `packages/shared/src/schemas/bento-item.ts`에 항목
   하나의 데이터 모양을 적는다. 완료 기준: 올바른 항목은 통과하고 잘못된 항목은
   거부된다.
2. **페이지 데이터 모양** — `packages/shared/src/schemas/page.ts`에 page와
   `bento`를 함께 반환하는 조회 결과 및 저장 요청 모양을 적는다. 완료 기준:
   page만, Bento만, 둘 다 바뀐 요청을 표현할 수 있다.
3. **배치 규칙 연결** — 기존 `bento-layout.ts` 규칙을 저장 계약에 연결한다. 완료
   기준: wide/compact 위치와 크기를 같은 규칙으로 검사한다.
4. **Bento 저장 칸** — `packages/db/src/schema/bento-items.ts`를 정의한다. 완료
   기준: DB client에 등록할 테이블과 page 관계가 정해진다.
5. **미디어 기록 칸** — `bento-media-assets.ts`를 정의한다. 완료 기준: 파일
   key와 예약·첨부·삭제 대기 상태를 기록할 수 있다.
6. **page+Bento 읽기 함수** — `pages.service.ts`의 `findPageInfo`가 handle로
   LEFT JOIN 조회를 한다. 완료 기준: Bento가 0개거나 여러 개여도 한 DB 조회로
   결과를 얻는다.
7. **조회 결과 정리 함수** — `pages.service.ts`가 JOIN 행을 page 하나와 `bento`
   배열로 묶는다. 완료 기준: 아이템이 없을 때도 page가 반환된다.
8. **GET 경로 연결** — `pages.route.ts`가 조회 서비스를 부른다. 완료 기준:
   `GET /pages/:handle` 한 번으로 page와 `bento`를 받는다.
9. **브라우저 조회 요청** — `features/page/api.ts`와 `queries.ts`에 handle
   조회를 연결한다. 완료 기준: 서버 선조회와 브라우저가 같은 query key를 쓴다.
10. **화면 변경 함수** — `features/bento/commands.ts`와 `reducer.ts`에 추가,
    수정, 삭제, 이동 결과를 화면 목록에 반영하는 함수를 둔다. 완료 기준: 이
    함수들은 DB나 네트워크에 접근하지 않는다.
11. **저장할 변경 계산** — `features/bento/batch.ts`가 서버에서 받은 목록과 화면
    목록을 비교한다. 완료 기준: 저장 전에 만들고 지운 항목은 빠지고, 지운 기존
    항목은 삭제 대상으로 잡힌다.
12. **Bento DB 저장 함수** — `bento.repository.ts`에 page 범위가 붙은 저장과
    삭제를 둔다. 완료 기준: 다른 page의 항목을 수정하거나 지울 수 없다.
13. **Bento 저장 규칙** — `bento-batch-policy.ts`가 중복 ID와 최종 배치를 DB
    없이 검사한다. 완료 기준: 중복 ID와 범위 밖 배치는 거부된다.
14. **Bento 저장 연결** — `bento.service.ts`가 12번 DB 함수와 13번 규칙을
    연결한다. 완료 기준: 한 page의 Bento 변경만 저장된다.
15. **page+Bento 한꺼번에 저장** — `pages.service.ts`가 page 필드와 Bento 저장을
    한 transaction으로 묶는다. 완료 기준: 어느 한쪽이 실패하면 둘 다 저장되지
    않는다.
16. **PATCH 경로 연결** — `pages.route.ts`가 권한·입력 확인 후 저장 서비스를
    부른다. 완료 기준: page만, Bento만, 둘 다 바뀐 요청이 같은 경로를 쓴다.
17. **자동 저장 대기열** — `use-page-autosave.ts`가 page와 Bento 변경을 모아
    1.5초 뒤 16번 경로로 보낸다. 완료 기준: 같은 대기 시간 안의 두 변경이 PATCH
    한 번에 담긴다.
18. **저장 실패 문구** — `features/page/ui/indicator.tsx`는 바깥에서 받은 문구만
    보여준다. 완료 기준: 실패 때 page 전체에 destructive 색상 글자가 보이며 성공
    토스트나 재시도 동작은 없다.
19. **미디어 예약 서비스** — 미디어 서비스가 파일 key와 예약 상태를 DB에
    기록한다. 완료 기준: 같은 예약 ID는 항상 같은 기록과 key를 돌려준다.
20. **미디어 전송 연결** — 브라우저가 예약 key로 R2에 파일을 올리고, 서버가
    Bento 저장 전에 파일 존재를 확인한다. 완료 기준: 업로드 확인 전에는 Bento
    저장 요청을 보내지 않는다.
21. **주간 미디어 정리** — `apps/cron`이 삭제 대기 파일과 만료된 미사용 예약을
    정리한다. 완료 기준: R2 삭제 실패는 다음 주 실행에서 이어서 처리되고, Bento
    저장 요청은 R2 파일을 지우지 않는다.
22. **링크 미리보기** — `bento-link-preview.service.ts`가 HTTPS 페이지에서 제목,
    설명, 이미지 등을 읽는다. 완료 기준: DB를 바꾸지 않고, 화면의 URL이 요청
    URL과 같을 때만 결과를 반영한다.
23. **화면 조립** — page 조회, Bento 화면 변경, 자동 저장, 실패 문구를 UI에
    연결한다. 완료 기준: Bento 편집이 page autosave 흐름에 포함된다.
    새로고침하면 저장된 값이 보이고, 저장 실패 때 편집 중인 값과 실패 문구가
    남는다.
24. **전체 흐름 확인** — 좁은 범위의 서버 테스트로 page+Bento 동시 저장, 한쪽
    실패 시 전체 취소, 다른 page ID 거부, 미디어 상태 변경과 cron 정리를
    확인한다. UI는 수동으로 저장 전 생성 후 삭제와 새로고침 시 미저장 변경
    폐기를 확인한다.

이 문서는 설계 결과만 담는다. 여기서는 코드 작성이나 테스트 실행을 하지 않는다.

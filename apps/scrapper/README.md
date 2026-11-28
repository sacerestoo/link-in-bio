# Scrapper API

URL 메타데이터 추출 전용 API입니다. API 서버가 `packages/contracts`의 URL
규칙으로 provider와 target을 판별해 전달하면, Scrapper가 해당 Python handler를
골라 페이지와 공통 메타데이터를 가져옵니다.

## Endpoint

- GET / 또는 GET /api/metadata: 상태 반환
- POST /api/metadata: 전달받은 URL, provider, target으로 메타데이터 추출
- `mode`는 선택이며 기본값은 `fetcher`; `session`을 지정하면 `FetcherSession`을
  사용합니다.

요청 예시:

    POST /api/metadata
    Authorization: Bearer <SCRAPPER_API_TOKEN>
    Content-Type: application/json

    {"url":"https://example.com","provider":"generic","target":"webpage","mode":"fetcher"}

## 동작

- `GET /` 또는 `GET /api/metadata`는 상태를 반환합니다.
- POST 요청은 내부 bearer token을 확인한 뒤 URL의 공개 주소 여부를 검사하고,
  전달받은 provider와 target에 맞는 Python handler로 추출합니다.
- Twitch 인증은 API 서버가 전달한 `accessToken`과 `clientId`를 사용합니다.
  YouTube, GitHub, Product Hunt 토큰은 만료 정책이 없어 Scrapper 환경변수에서
  읽고 Durable Object가 관리하지 않습니다.
- 성공 시 고정 응답 계약을 반환합니다. 잘못된 URL은 `400`, 공인 IP로 확인되지
  않는 주소는 `403`, HTML이 아닌 응답은 `415`, 큰 응답은 `413`을 반환합니다.
- CHZZK의 `channel` target은 공식 Open API를 사용합니다. 실행 환경에
  `CHZZK_CLIENT_ID`와 `CHZZK_CLIENT_SECRET`을 설정해야 합니다.
- Discord의 `invite` target은 Discord API에서 초대의 서버·채널 정보와 근사 멤버
  수를 가져옵니다.

## URL 분류

URL host, path, query 규칙은 `packages/contracts/src/provider-targets.json` 한
곳에 있습니다. API 서버의 `@grabbin/contracts` matcher가 이 규칙으로 provider,
target, params를 고릅니다. Scrapper의 `providers/<provider>/targets/<type>.py`는
provider별 가져오기와 추출 함수만 등록하며, `sources/selector.py`가 전달된
provider와 target으로 handler를 선택합니다.

Threads의 `profile`과 `post` target은 `threads.com` 및 `threads.net`의 `@handle`
경로를 인식합니다. 프로필 응답은 `username`, `profile_url`을 담고, 페이지
설명에서 팔로워 수를 읽을 수 있으면 `follower_count`도 반환합니다. 게시물 응답은
`username`, `post_id`, `permalink`, `text`, `like_count`를 `provider_data`에
담습니다. `text`는 페이지 설명에서 가져오므로 빈 문자열일 수 있습니다. 축약된
팔로워 수를 정수로 환산하면 `follower_count_approximate: true`도 반환합니다.

`api/metadata.py`는 POST body와 bearer token을 확인하는 HTTP 진입점입니다.
`application/metadata_service.py`는 URL 공개 주소 검증, 전달받은 Python handler
선택, 공통 추출과 응답 생성을 조정합니다. 알려진 provider의 target 규칙이
일치하지 않으면 설정된 기본 target을, 미등록 host는 `generic/webpage`를
사용합니다. 미등록 host의 `/feed`, `/rss`, `.xml` 경로는 RSS feed로 분류하며
`pin.it`은 리다이렉트를 따라가지 않고 `short_link`로 분류합니다.

`routing/url_safety.py`는 URL을 정규화하고 DNS 응답이 모두 공인 IP인지
확인합니다. Python target은 `contracts/source.py`의 `MetadataSource`로 전용
fetcher나 추출 함수를 선언합니다. `sources/selector.py`는 target의 설정을 공용
기본값과 합치며, target이 별도 source를 선언하지 않으면 기본 Scrapling Fetcher와
공통 HTML 추출기를 사용합니다. `sources/fetcher.py`는 Scrapling의 `Fetcher`와
`FetcherSession`을 호출하고, `sources/html_metadata.py`는 응답에서 공통 Open
Graph, Twitter, title 및 link 필드를 추출합니다. X 프로필 target은 HTML에서
팔로워 수를 추가합니다. Instagram의 `post`와 `profile` target은 공식 API를
호출하지 않습니다. 프로필 페이지가 로그인으로 리다이렉트되면 공개 프로필
`/embed/` HTML을 읽고 최신 항목부터 최대 4개의 `recent_posts`를 반환합니다. 각
항목에는 shortcode, permalink, thumbnail URL이 있습니다. Instagram이 제공하지
않는 값은 `provider_data`에서 생략합니다.

`contracts/settings.py`는 요청 시간·리다이렉트·HTML 크기 제한을 관리하고,
`contracts/errors.py`는 application과 API에서 공통으로 처리하는 오류를
정의합니다.

URL 분류 자체는 DNS 조회를 수행하지 않습니다. 실제 요청 직전 DNS 응답이 공인
IP인지 확인하고, Scrapling의 `follow_redirects="safe"` 옵션으로 private/internal
IP를 향하는 리다이렉트를 거부합니다. Fetcher는 확인된 DNS 주소에 연결을 고정하지
않습니다.

## 응답 형식

아래는 성공 응답 계약 예시입니다. `target_type`은 URL 분류기의 결과이고,
provider별 추가 값은 `provider_data`에 담습니다. 해당 target에 추가 데이터가
없으면 빈 객체를 반환합니다. 기존 `type`은 Open Graph의 `og:type` 값으로
유지합니다. Instagram과 X 프로필 수치는 JSON 숫자로 제공하고, 축약된 원본
수치에서 환산했다면 해당 필드에 `_approximate: true`를 함께 제공합니다.

    {
      "requested_url": "https://www.instagram.com/stelliveofficial",
      "final_url": "https://www.instagram.com/stelliveofficial",
      "provider": "instagram",
      "http_status": 200,
      "title": "...",
      "description": "...",
      "image_url": "...",
      "site_name": "www.instagram.com",
      "type": "profile",
      "canonical_url": "https://www.instagram.com/stelliveofficial/",
      "favicon_url": "...",
      "target_type": "profile",
      "provider_data": {
        "username": "stelliveofficial",
        "follower_count": 39000,
        "follower_count_approximate": true,
        "following_count": 3,
        "following_count_approximate": false,
        "post_count": 143,
        "post_count_approximate": false,
        "recent_posts": [
          {
            "shortcode": "DgPNN61i4EO",
            "permalink": "https://www.instagram.com/stelliveofficial/p/DgPNN61i4EO/",
            "thumbnail_url": "https://scontent.cdninstagram.com/..."
          }
        ]
      },
      "fetcher": "Fetcher"
    }

## 로컬 실행

Vercel CLI가 필요합니다. Scrapper 프로젝트의 root directory가
`apps/scrapper`이므로 monorepo 루트에서 로컬 환경 변수를 전달해 개발 서버를
시작합니다.

    uv python install 3.12
    uv venv --python 3.12 apps/scrapper/.venv
    source apps/scrapper/.venv/bin/activate
    uv pip install -e apps/scrapper
    uv run --env-file apps/scrapper/.env.local -- vercel dev --listen 3002 apps/scrapper

개발 서버는 `http://localhost:3002`에서 실행됩니다.

## 배포

Vercel 프로젝트에는 `SCRAPPER_API_TOKEN`, CHZZK의 `CHZZK_CLIENT_ID`와
`CHZZK_CLIENT_SECRET`, 그리고 YouTube API 키, GitHub 토큰, Product Hunt 토큰을
설정합니다. Twitch 앱의 `TWITCH_CLIENT_ID`와 `TWITCH_CLIENT_SECRET`, Token
Manager 암호화 키 `TOKEN_ENCRYPTION_KEY`는 API Worker의
`SERVER_ENV_PRODUCTION`에 두며, Token Manager는 Twitch access token을 Durable
Object 저장소에 암호화합니다. `SCRAPPER_API_TOKEN`과 Scrapper endpoint URL은
`apps/server`의 `SERVER_ENV_PRODUCTION`에도 설정하고, URL은 `/api/metadata`
경로까지 포함해야 합니다.

Vercel CLI 계정에 로그인한 뒤 `apps/scrapper` 프로젝트 루트에서 production
deployment를 실행합니다.

    vercel deploy --prod

Production 전환은 API Worker를 먼저 배포한 뒤 Scrapper를 배포합니다. 두 배포가
적용된 다음 Vercel에서 `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `REDIS_URL`,
`KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`,
`KV_REST_API_READ_ONLY_TOKEN`을 제거합니다. YouTube, GitHub, Product Hunt 토큰은
Scrapper 환경변수에 남깁니다.

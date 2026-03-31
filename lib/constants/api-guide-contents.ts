export interface ApiGuideContent {
  title: string
  steps: string[]
  signupUrl: string
  cost: string
  warnings: string[]
}

export const API_GUIDE_CONTENTS: Record<string, ApiGuideContent> = {
  claude: {
    title: 'Claude API (Anthropic)',
    steps: [
      'Anthropic 공식 웹사이트(console.anthropic.com)에 방문합니다.',
      '계정에 로그인하거나 새로 가입합니다.',
      '왼쪽 메뉴에서 "API Keys"를 클릭합니다.',
      '"Create Key" 버튼을 클릭하여 새 API 키를 생성합니다.',
      '생성된 API 키를 복사하여 위의 입력란에 붙여넣습니다.',
    ],
    signupUrl: 'https://console.anthropic.com/account/keys',
    cost: '사용량 기반 결제 (1M input tokens: $3, 1M output tokens: $15 기준)',
    warnings: [
      'API 키는 절대 공개하면 안 됩니다.',
      '주기적으로 키를 갱신하는 것을 권장합니다.',
      '사용량을 모니터링하여 예상치 못한 비용을 방지하세요.',
    ],
  },
  openai: {
    title: 'OpenAI API (GPT)',
    steps: [
      'OpenAI 공식 웹사이트(platform.openai.com)에 방문합니다.',
      '계정에 로그인하거나 새로 가입합니다.',
      '왼쪽 메뉴에서 "API keys"를 클릭합니다.',
      '"Create new secret key" 버튼을 클릭합니다.',
      '생성된 키를 복사하여 위의 입력란에 붙여넣습니다.',
      '결제 방법을 설정하여 API 사용을 활성화합니다.',
    ],
    signupUrl: 'https://platform.openai.com/api-keys',
    cost: '사용량 기반 결제 (GPT-4o: 1M input tokens: $5, 1M output tokens: $15 기준)',
    warnings: [
      'API 키는 git이나 공개 저장소에 커밋하면 안 됩니다.',
      '의도하지 않은 대량 사용을 방지하기 위해 사용 제한을 설정하세요.',
      '정기적으로 미사용 키를 삭제합니다.',
    ],
  },
  gemini: {
    title: 'Google Gemini API',
    steps: [
      'Google AI Studio(aistudio.google.com)에 방문합니다.',
      'Google 계정으로 로그인합니다.',
      '왼쪽 메뉴에서 "API Keys"를 클릭합니다.',
      '"Create API key" 버튼을 클릭합니다.',
      '새로운 프로젝트를 선택하거나 기존 프로젝트에서 생성합니다.',
      '생성된 API 키를 복사하여 위의 입력란에 붙여넣습니다.',
    ],
    signupUrl: 'https://aistudio.google.com/app/apikey',
    cost: '일부 모델은 무료, 고급 모델은 사용량 기반 결제',
    warnings: [
      'API 키가 노출되면 즉시 비활성화합니다.',
      'Google Cloud 프로젝트의 결제를 확인합니다.',
      '무료 tier의 사용량 제한을 숙지하세요.',
    ],
  },
  imagen: {
    title: 'Google Imagen 3 (Google AI Studio)',
    steps: [
      'Google AI Studio(aistudio.google.com)에 방문합니다.',
      'Google 계정으로 로그인합니다.',
      '왼쪽 메뉴에서 "API Keys"를 클릭합니다.',
      '"Create API key" 버튼을 클릭합니다.',
      '새로운 프로젝트를 선택하거나 기존 프로젝트에서 생성합니다.',
      '생성된 API 키를 복사하여 위의 입력란에 붙여넣습니다.',
      'Gemini 키와 동일한 형식의 API 키입니다.',
    ],
    signupUrl: 'https://aistudio.google.com/app/apikey',
    cost: '사용량 기반 결제 (이미지당 요금 부과)',
    warnings: [
      '이미지 생성 모델은 별도의 요금 정책을 따릅니다.',
      '생성 이미지의 저작권 관련 약관을 확인합니다.',
      'API 키는 보안 저장소에 안전히 보관합니다.',
    ],
  },
  naver_ad: {
    title: 'Naver Search Ads API (네이버 검색광고)',
    steps: [
      '【1단계: 네이버 검색광고 계정 생성】',
      '① 네이버 검색광고(searchad.naver.com)에 접속합니다.',
      '② 네이버 계정으로 로그인합니다. (없으면 네이버 가입 먼저)',
      '③ 광고 계정을 생성합니다. (사업자 또는 개인으로 가입 가능, 광고 집행 불필요)',
      '【2단계: API 키 발급】',
      '④ 로그인 후 상단 메뉴 "도구" → "API 사용 관리"를 클릭합니다.',
      '⑤ "API 키 신청" 버튼을 클릭하여 새 API 키를 발급받습니다.',
      '⑥ 발급된 "API License (키)"를 복사합니다. → 앱의 "API 키" 입력란에 붙여넣습니다.',
      '⑦ 같은 페이지에서 "Secret Key"를 복사합니다. → 앱의 "API Secret" 입력란에 붙여넣습니다.',
      '【3단계: Customer ID 확인】',
      '⑧ 네이버 검색광고 메인 화면의 좌측 상단을 확인합니다.',
      '⑨ 광고 계정 이름 옆에 표시된 숫자(예: 1234567)가 Customer ID입니다.',
      '⑩ 이 숫자를 앱의 "Customer ID" 입력란에 붙여넣습니다.',
    ],
    signupUrl: 'https://manage.searchad.naver.com',
    cost: 'API 자체는 무료 (네이버 검색광고 계정만 있으면 됨, 광고 집행 불필요)',
    warnings: [
      'API Key, Secret Key, Customer ID 세 가지 모두 입력해야 정상 동작합니다.',
      'Secret Key는 절대 외부에 노출하면 안 됩니다.',
      '광고 계정이 없으면 API 키 발급이 불가능합니다. (광고비 지출은 필요 없음)',
      'API 사용량 제한이 있으므로 과도한 호출에 주의합니다.',
    ],
  },
  naver_search: {
    title: 'Naver Search API',
    steps: [
      '네이버 개발자 센터(developers.naver.com)에 방문합니다.',
      '계정에 로그인하거나 새로 가입합니다.',
      '마이 페이지에서 애플리케이션을 등록합니다.',
      '"API 설정" 메뉴에서 검색 API를 활성화합니다.',
      'Client ID와 Client Secret을 발급받습니다.',
      '이 두 값을 각각 "API Key"와 "Secret" 입력란에 붙여넣습니다.',
    ],
    signupUrl: 'https://developers.naver.com/apps',
    cost: '일일 쿼리 제한 있음 (프리 티어: 25,000회/일)',
    warnings: [
      'Client Secret은 공개 저장소에 커밋하면 안 됩니다.',
      '일일 쿼리 제한을 초과하면 요청이 거부됩니다.',
      '이용약관을 숙지하고 검색 결과 사용 규칙을 준수합니다.',
    ],
  },
  google_kwp: {
    title: 'Google Keyword Planner API',
    steps: [
      // ── 1단계: Google Ads 관리자 계정 ──
      '【1단계: Google Ads 관리자 계정(MCC) 만들기】',
      '① ads.google.com/home/tools/manager-accounts 에 접속합니다.',
      '② Google 계정으로 로그인 → "새 관리자 계정 만들기"를 클릭합니다.',
      '③ 계정 이름(예: "내 키워드 분석")을 입력하고 계정을 생성합니다.',
      '④ 생성된 관리자 계정에서 좌측 메뉴 "결제" → 결제 수단(카드)을 등록합니다. (실제 광고비 지출 불필요, 등록만 하면 됩니다)',
      // ── 2단계: Developer Token ──
      '【2단계: Developer Token 발급】',
      '⑤ ads.google.com/aw/apicenter 에 접속합니다. (관리자 계정으로 로그인 상태)',
      '⑥ "Developer token" 항목에서 토큰이 표시됩니다. 처음에는 "Test account access" 상태입니다.',
      '⑦ "Apply for Basic Access" 버튼을 클릭하고 양식을 작성하여 제출합니다.',
      '⑧ Google 심사 후 Basic Access가 승인되면 (보통 2~5일) 22자리 Developer Token을 사용할 수 있습니다.',
      '⑨ 이 Developer Token은 서버 환경변수(GOOGLE_ADS_DEVELOPER_TOKEN)에 설정합니다. → 앱 관리자에게 전달하세요.',
      // ── 3단계: OAuth2 자격증명 ──
      '【3단계: Google Cloud에서 OAuth2 자격증명 발급 — 이 값을 앱에 입력합니다】',
      '⑩ console.cloud.google.com 에 접속 → 상단 프로젝트 선택 드롭다운 → "새 프로젝트" 클릭 → 이름 입력(예: "BlogHub KWP") → "만들기".',
      '⑪ 좌측 메뉴 "API 및 서비스" → "라이브러리" 클릭 → 검색창에 "Google Ads API" 입력 → 결과에서 "Google Ads API" 클릭 → "사용" 버튼 클릭.',
      '⑫ 좌측 메뉴 "API 및 서비스" → "OAuth 동의 화면" 클릭 → "외부" 선택 → "만들기".',
      '⑬ 앱 이름(예: "BlogHub"), 사용자 지원 이메일, 개발자 연락처 이메일을 입력 → "저장 후 계속" (나머지 단계는 기본값으로 넘깁니다).',
      '⑭ 좌측 메뉴 "API 및 서비스" → "사용자 인증 정보" 클릭 → 상단 "+ 사용자 인증 정보 만들기" → "OAuth 클라이언트 ID" 선택.',
      '⑮ 애플리케이션 유형: "웹 애플리케이션" 선택 → 이름 입력 → "만들기" 클릭.',
      '⑯ 팝업에 표시된 "클라이언트 ID"와 "클라이언트 보안 비밀번호"를 복사합니다.',
      '⑰ 이 두 값을 앱의 설정 > API 키 관리 > Google Keyword Planner의 "API Key"(=Client ID)와 "Secret"(=Client Secret)에 붙여넣습니다.',
    ],
    signupUrl: 'https://ads.google.com/home/tools/manager-accounts/',
    cost: 'API 자체는 무료 (Google Ads 계정에 결제 수단 등록 필요, 실제 광고비 지출 불필요)',
    warnings: [
      'Developer Token 심사에 2~5일 소요됩니다. 심사 전에는 테스트 계정만 이용 가능합니다.',
      'OAuth Client Secret은 절대 외부에 노출하면 안 됩니다.',
      'Keyword Planner API는 Basic Access면 충분합니다. Standard Access 신청은 불필요합니다.',
      '결제 수단이 등록된 Google Ads 계정이 있어야 키워드 데이터를 정상 조회할 수 있습니다.',
    ],
  },
  coupang: {
    title: 'Coupang Partners API',
    steps: [
      'Coupang Partners 웹사이트에 로그인합니다.',
      '파트너 센터 > 계정 설정으로 이동합니다.',
      'API 관리 섹션에서 새 API 키를 생성합니다.',
      'Access Key와 Secret Key를 모두 발급받습니다.',
      '이 두 값을 각각 API Key와 Secret 입력란에 붙여넣습니다.',
      '키 생성 후 활성화될 때까지 기다립니다.',
    ],
    signupUrl: 'https://partners.coupang.com',
    cost: '쿠팡 제휴 수수료 정책에 따름',
    warnings: [
      'Secret Key는 절대 공개하면 안 됩니다.',
      '파트너 규약을 준수하여 API를 사용합니다.',
      '정기적으로 API 사용량을 모니터링합니다.',
    ],
  },
  amazon: {
    title: 'Amazon Product Advertising API',
    steps: [
      'Amazon Associates 프로그램에 가입합니다.',
      '계정 설정에서 "API Keys"를 찾습니다.',
      '"Create new access key" 버튼을 클릭합니다.',
      'Access Key와 Secret Access Key가 생성됩니다.',
      '비활성화되기 전에 두 값을 모두 복사합니다.',
      '각각을 API Key와 Secret 입력란에 붙여넣습니다.',
    ],
    signupUrl: 'https://affiliate-program.amazon.com',
    cost: 'Amazon Associates 프로그램 참여 필요 (수수료 기반)',
    warnings: [
      'Secret Access Key는 재표시되지 않으므로 즉시 저장합니다.',
      'Amazon 어소시에이츠 프로그램의 운영 정책을 준수합니다.',
      '계정이 활성 상태로 유지되어야 API가 작동합니다.',
    ],
  },
  google_trends: {
    title: 'Google Trends API',
    steps: [
      '현재 Google Trends RSS 피드를 기본으로 사용하므로 API 키가 없어도 기본 기능은 동작합니다.',
      '고급 기능(상세 트렌드 분석)을 위해 SerpAPI 키를 등록할 수 있습니다.',
      'https://serpapi.com/ 에서 계정 생성',
      'Dashboard에서 API Key 복사',
      '위 입력란에 API Key 붙여넣기',
    ],
    signupUrl: 'https://serpapi.com/google-trends-api',
    cost: 'SerpAPI 무료 플랜: 월 100회 검색 제공. 유료 플랜은 사용량에 따라 과금',
    warnings: [
      'API 키 없이도 Google Trends RSS 피드로 기본 트렌드 수집이 가능합니다.',
      'SerpAPI 키 등록 시 고급 트렌드 분석 기능을 사용할 수 있습니다.',
      '무료 플랜의 월별 사용량 제한을 초과하지 않도록 주의하세요.',
    ],
  },
  interpark: {
    title: '인터파크 티켓',
    steps: [
      '현재 네이버 검색을 통해 인터파크 공연 정보를 수집하므로 별도 API 키가 없어도 기본 기능은 동작합니다.',
      '인터파크 Open API를 사용하려면 별도 제휴가 필요합니다.',
      '향후 직접 크롤링 기능이 추가될 예정입니다.',
    ],
    signupUrl: 'https://ticket.interpark.com/',
    cost: '기본 기능은 무료 (인터파크 Open API 제휴 시 별도 협의)',
    warnings: [
      'API 키 없이도 네이버 검색 기반으로 공연 정보 수집이 가능합니다.',
      '인터파크 Open API 직접 연동은 제휴 계약이 필요합니다.',
      '수집한 공연 정보는 인터파크 이용약관을 준수하여 사용해야 합니다.',
    ],
  },
}

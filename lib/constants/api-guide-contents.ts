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
    title: 'Naver Advertising Platform',
    steps: [
      '네이버 비즈니스 플랫폼(https://advertiser.naver.com)에 방문합니다.',
      '네이버 계정으로 로그인합니다.',
      '광고 계정을 생성하거나 기존 계정을 선택합니다.',
      '계정 설정에서 API 키 생성 메뉴를 찾습니다.',
      'API 키와 시크릿을 함께 생성합니다.',
      '두 값 모두 안전한 장소에 저장합니다.',
    ],
    signupUrl: 'https://advertiser.naver.com',
    cost: '광고 예산에 따라 결정 (API 이용료 별도)',
    warnings: [
      '시크릿은 절대 노출되면 안 됩니다.',
      '광고 계정의 활성 상태를 확인합니다.',
      '정기적으로 API 접근 로그를 검토합니다.',
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
    title: 'Google Keyword Planner',
    steps: [
      'Google Ads 계정(ads.google.com)을 생성하거나 로그인합니다.',
      '화면 우측 상단의 도구 아이콘 > "Keyword Planner"를 선택합니다.',
      '프로젝트를 생성하고 API 활성화를 진행합니다.',
      'Google Cloud 콘솔에서 Google Ads API를 활성화합니다.',
      '서비스 계정 키를 생성하여 JSON 파일을 다운로드합니다.',
      'JSON 파일의 내용을 API 키 입력란에 붙여넣습니다.',
    ],
    signupUrl: 'https://ads.google.com',
    cost: '대부분의 기본 기능은 무료',
    warnings: [
      'Google Ads 계정이 활성 상태여야 합니다.',
      'API 쿼터를 초과하지 않도록 주의합니다.',
      '서비스 계정 키는 매우 민감한 정보이므로 보호합니다.',
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
}

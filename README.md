# 화면 & 웹캠 녹화기

웹캠과 화면을 동시에 녹화하고 Google Drive에 자동 업로드하는 웹 애플리케이션입니다.

## 🚀 주요 기능

- **동시 녹화**: 웹캠과 화면을 동시에 녹화
- **실시간 미리보기**: 녹화 중인 내용을 실시간으로 확인
- **자동 업로드**: 녹화 완료 후 Google Drive에 자동 업로드
- **드래그앤드롭 업로드**: 기존 비디오 파일 직접 업로드
- **모던 UI**: 직관적이고 아름다운 사용자 인터페이스
- **반응형 디자인**: 모든 디바이스에서 최적화된 경험

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js, Google Cloud Storage
- **APIs**: 
  - MediaDevices API (웹캠 접근)
  - Screen Capture API (화면 녹화)
  - MediaRecorder API (미디어 녹화)
  - Google Drive API v3 (파일 업로드)
  - Google Cloud Storage (Signed URL)

## 📋 시스템 요구사항

- **브라우저**: Chrome 72+, Firefox 65+, Safari 12+, Edge 79+
- **프로토콜**: HTTPS (보안 요구사항)
- **권한**: 카메라, 마이크, 화면 공유 권한 필요

## 🚦 개발 진행 상황

### ✅ Phase 1: 기본 구조 (완료)
- [x] HTML 구조 설계
- [x] CSS 스타일링 (모던 UI)
- [x] JavaScript 기본 구조
- [x] 반응형 디자인

### ✅ Phase 2: 미디어 녹화 (완료)
- [x] 웹캠 접근 및 녹화 (getUserMedia API)
- [x] 화면 공유 및 녹화 (getDisplayMedia API)
- [x] 동시 녹화 관리 (MediaRecorder API)
- [x] 미디어 스트림 처리 및 파일 다운로드
- [x] 에러 처리 및 사용자 알림 시스템
- [x] 실시간 미리보기 기능

### ✅ Phase 3: Google Drive 연동 (완료)
- [x] Google Drive API 설정 및 초기화
- [x] OAuth 2.0 인증 시스템
- [x] 자동 파일 업로드 기능
- [x] 업로드 진행률 표시 및 에러 처리
- [x] 업로드 폴더 자동 생성 및 관리
- [x] 다중 파일 동시 업로드 지원

### ✅ Phase 4: 최종 통합 (완료)
- [x] **전체 워크플로우 통합**
  - 녹화 → 저장 → 업로드 과정 완전 자동화
  - 각 단계별 실시간 피드백 제공

- [x] **향상된 에러 처리 시스템**
  - 🔐 인증, 🚫 권한, 📊 용량 등 상황별 아이콘 표시
  - 구체적인 해결 방법 및 대안 제시
  - 자동 재시도 옵션 안내

- [x] **고급 사용자 피드백 시스템**
  - ℹ️ 정보 알림: 진행 상황 안내
  - ⚠️ 경고 알림: 주의사항 및 권한 요청
  - ✅ 성공 알림: 완료 확인 및 결과 표시
  - 알림 지속 시간 자동 조절

- [x] **실시간 상태 모니터링**
  - 📹 웹캠: 연결 → 녹화 → 완료 상태 표시
  - 🖥️ 화면: 공유 설정 → 녹화 → 완료 상태 표시  
  - 💾 저장: 준비 → 저장 → 업로드 → 완료 상태 표시
  - 시각적 상태 표시 (색상 변화)

- [x] **모바일 최적화**
  - 반응형 상태 모니터 (세로 배치)
  - 터치 친화적 인터페이스
  - 최적화된 알림 크기

- [x] **최종 테스트 및 검증**
  - 전체 기능 통합 테스트 완료
  - 에러 시나리오 대응 검증
  - 사용자 경험 최적화

### 🚀 Phase 5: 드래그앤드롭 + Signed URL 통합 (진행 중)
- [x] **프론트엔드 드래그앤드롭 UI**
  - 📁 드래그앤드롭 영역 추가
  - 🎨 모던 UI/UX 디자인 (glassmorphism 스타일)
  - 📱 모바일 반응형 최적화
  - ⚡ 실시간 업로드 진행률 표시

- [x] **백엔드 API 서버**
  - 🚀 Express.js + Google Cloud Storage
  - 🔑 Signed URL 생성 API
  - 🔒 보안 검증 (파일 타입, 크기 제한)
  - 📊 완전한 에러 처리 및 로깅

- [ ] **Google Cloud 설정**
  - [ ] Cloud Storage 버킷 생성
  - [ ] 서비스 계정 설정
  - [ ] Cloud Functions 배포 (Drive 이동 자동화)

- [ ] **배포 및 통합**
  - [ ] API 서버 배포 (Railway/Render)
  - [ ] 프론트엔드-백엔드 연동 테스트
  - [ ] 전체 워크플로우 검증

## 🏃‍♂️ 실행 방법

1. **HTTPS 서버 실행**:
```bash
   # Python 3를 사용하는 경우
   python -m http.server 8000
   
   # Node.js를 사용하는 경우
   npx serve .
   ```

2. **브라우저에서 접속**:
   - `https://localhost:8000` 또는 배포된 URL로 접속

3. **권한 허용**:
   - 웹캠, 마이크, 화면 공유 권한을 허용해주세요

## 📁 파일 구조

```
├── index.html          # 메인 HTML 파일
├── styles.css          # CSS 스타일시트
├── script.js           # 메인 JavaScript 로직
├── google-drive.js     # Google Drive API 연동
└── README.md           # 프로젝트 문서
```

## 🔧 설정

### Google Drive API 설정

Google Drive 자동 업로드를 사용하려면 추가 설정이 필요합니다:

#### 📦 프로덕션 배포 (GitHub Secrets 사용)

1. GitHub 저장소의 **Settings** → **Secrets and variables** → **Actions**로 이동
2. 다음 Repository Secrets를 추가:
   - `GOOGLE_DRIVE_KEY`: Google Cloud Console에서 발급받은 API Key
   - `GOOGLE_CLIENT_ID`: Google Cloud Console에서 발급받은 Client ID
3. 코드를 `main` 브랜치에 푸시하면 GitHub Actions가 자동으로 배포

#### 🛠️ 로컬 개발용 설정

**방법 1: 안전한 로컬 설정 파일 사용 (권장)**

1. `google-config-local.js` 파일에서 API 키를 설정:
   ```javascript
   window.GOOGLE_DRIVE_CONFIG = {
       CLIENT_ID: '실제_클라이언트_ID',      // 여기에 실제 Client ID 입력
       API_KEY: '실제_API_키',              // 여기에 실제 API Key 입력
       // ... 나머지 설정은 그대로
   };
   ```

2. `index.html`에 다음 줄을 추가:
   ```html
   <script src="google-config-local.js"></script>
   ```

3. 이 파일은 자동으로 `.gitignore`에 의해 제외됩니다.

**방법 2: 직접 수정 (주의 필요)**

1. `google-drive.js` 파일에서 직접 API 키를 수정
2. ⚠️ **절대 커밋하지 마세요** (보안상 위험)

#### 🔑 API 키 발급 방법

자세한 Google Cloud Console 설정은 [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md) 파일을 참조하세요.

## 🐛 알려진 이슈

- HTTPS 환경에서만 정상 작동합니다
- 일부 브라우저에서 화면 공유 시 오디오가 포함되지 않을 수 있습니다
- Google Drive API 설정이 완료되지 않으면 로컬 다운로드만 진행됩니다
- 대용량 파일 업로드 시 시간이 오래 걸릴 수 있습니다

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 👥 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

💡 **참고**: 이 앱은 교육 및 개발 목적으로 제작되었습니다. 
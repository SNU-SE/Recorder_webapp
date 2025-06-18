# Google Drive API 설정 가이드

웹 앱에서 Google Drive 자동 업로드 기능을 사용하기 위한 설정 방법입니다.

## 🚀 빠른 설정 (5분 소요)

### 1. Google Cloud Console 접속
[Google Cloud Console](https://console.cloud.google.com/)에 접속하여 Google 계정으로 로그인합니다.

### 2. 새 프로젝트 생성
1. 상단의 프로젝트 선택 드롭다운 클릭
2. "새 프로젝트" 클릭  
3. 프로젝트 이름: `Recorder-Webapp` (또는 원하는 이름)
4. "만들기" 클릭

### 3. Google Drive API 활성화
1. 좌측 메뉴에서 "API 및 서비스" > "라이브러리" 클릭
2. "Google Drive API" 검색
3. "Google Drive API" 클릭
4. "사용" 버튼 클릭

### 4. OAuth 2.0 클라이언트 ID 생성
1. 좌측 메뉴에서 "API 및 서비스" > "사용자 인증 정보" 클릭
2. 상단의 "+ 사용자 인증 정보 만들기" 클릭
3. "OAuth 클라이언트 ID" 선택

#### OAuth 동의 화면 설정 (처음 한 번만)
4. "OAuth 동의 화면 구성" 클릭
5. "외부" 선택 후 "만들기"
6. 필수 정보 입력:
   - 앱 이름: `화면 & 웹캠 녹화기`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 정보: 본인 이메일
7. "저장 후 계속" 클릭
8. 범위 단계에서 "저장 후 계속" 클릭
9. 테스트 사용자 단계에서 본인 이메일 추가 후 "저장 후 계속"

#### 클라이언트 ID 생성
10. "사용자 인증 정보" 탭으로 돌아가기
11. "+ 사용자 인증 정보 만들기" > "OAuth 클라이언트 ID"
12. 애플리케이션 유형: "웹 애플리케이션"
13. 이름: `Recorder Webapp Client`
14. 승인된 JavaScript 출처에 **정확히** 다음을 추가:
    ```
    https://snu-se.github.io
    ```
    ⚠️ **중요**: 반드시 이 도메인을 정확히 입력해야 합니다!
15. "만들기" 클릭

### 5. API 키 생성
1. "+ 사용자 인증 정보 만들기" > "API 키" 클릭
2. API 키가 생성되면 "키 제한" 클릭
3. API 제한사항에서 "키 제한" 선택
4. "Google Drive API" 체크 후 저장

### 6. GitHub Secrets에 정보 입력

생성된 정보를 GitHub 저장소의 Secrets에 안전하게 저장합니다:

1. **GitHub 저장소** → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭하여 다음 2개를 추가:

| Name | Value |
|------|-------|
| `GOOGLE_DRIVE_KEY` | 5단계에서 생성한 **API 키** |
| `GOOGLE_CLIENT_ID` | 4단계에서 생성한 **클라이언트 ID** |

⚠️ **중요**: 
- API 키와 클라이언트 ID를 정확히 복사해서 붙여넣으세요
- 앞뒤 공백이 없는지 확인하세요
- GitHub Actions에서 자동으로 코드에 삽입됩니다

### 7. 배포 확인

GitHub Secrets 설정 후:
1. 코드를 `main` 브랜치에 푸시
2. **GitHub Actions**가 자동으로 실행되어 배포
3. 약 1-2분 후 https://snu-se.github.io/Recorder_webapp/ 에서 확인

## 🔧 테스트 방법

1. **웹 앱 접속**: https://snu-se.github.io/Recorder_webapp/
2. **F12** 키로 개발자 도구 → **Console** 탭에서 다음 확인:
   ```
   ✅ Google Drive 설정 확인 완료
   CLIENT_ID: 실제_키의_일부...
   ```
3. **녹화 테스트**:
   - 녹화 시작 및 종료
   - 브라우저에서 Google 로그인 팝업 허용
   - Google Drive 접근 권한 허용
4. **업로드 확인**: Google Drive에서 `_School/9. Recorder WebAPP/오늘날짜/` 폴더 확인

## ❗ 문제 해결

### 401 Unauthorized 오류
- **원인**: 승인된 JavaScript 출처 미설정
- **해결**: Google Cloud Console에서 `https://snu-se.github.io` 정확히 추가

### API 키가 기본값으로 나타남
- **원인**: GitHub Secrets 미설정
- **해결**: Repository secrets에 `GOOGLE_DRIVE_KEY`, `GOOGLE_CLIENT_ID` 추가

---

이 설정을 완료하면 녹화된 파일이 자동으로 Google Drive의 날짜별 폴더에 업로드됩니다! 🎉
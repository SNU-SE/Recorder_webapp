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
14. 승인된 JavaScript 출처 추가:
    ```
    http://localhost:8000
    https://localhost:8000
    https://yourdomain.com (실제 배포 도메인)
    ```
15. "만들기" 클릭

### 5. API 키 생성
1. "+ 사용자 인증 정보 만들기" > "API 키" 클릭
2. API 키가 생성되면 "키 제한" 클릭
3. API 제한사항에서 "키 제한" 선택
4. "Google Drive API" 체크 후 저장

### 6. 코드에 정보 입력

생성된 정보를 `google-drive.js` 파일에 입력합니다:

```javascript
const GOOGLE_DRIVE_CONFIG = {
    CLIENT_ID: '여기에_클라이언트_ID_입력',
    API_KEY: '여기에_API_키_입력',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/drive.file',
    FOLDER_NAME: '화면_웹캠_녹화'
};
```

## 🔧 테스트 방법

1. 설정 완료 후 웹 앱 실행
2. 녹화 시작 및 종료
3. 브라우저에서 Google 로그인 팝업 허용
4. Google Drive 접근 권한 허용
5. 업로드 완료 후 Google Drive에서 "화면_웹캠_녹화" 폴더 확인

---

이 설정을 완료하면 녹화된 파일이 자동으로 Google Drive에 업로드됩니다! 🎉
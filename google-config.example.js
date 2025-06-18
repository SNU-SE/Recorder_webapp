// Google Drive API 설정 (개발용 예시 파일)
// 실제 배포 시에는 GitHub Actions에서 환경변수로 주입됩니다
window.GOOGLE_DRIVE_CONFIG = {
    CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID',     // Google Cloud Console에서 발급받은 클라이언트 ID
    API_KEY: 'YOUR_GOOGLE_API_KEY',         // Google Cloud Console에서 발급받은 API 키
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/drive.file',
    SCHOOL_FOLDER_NAME: '_School',
    RECORDER_FOLDER_NAME: '9. Recorder WebAPP'
};

// 사용법:
// 1. 이 파일을 google-config.js로 복사
// 2. YOUR_GOOGLE_CLIENT_ID와 YOUR_GOOGLE_API_KEY를 실제 값으로 변경
// 3. google-config.js는 .gitignore에 추가하여 버전 관리에서 제외 
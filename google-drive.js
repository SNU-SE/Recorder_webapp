// Google Drive API 설정 (환경변수에서 로드)
const GOOGLE_DRIVE_CONFIG = window.GOOGLE_DRIVE_CONFIG || {
    CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID', // Google Cloud Console에서 발급받은 클라이언트 ID
    API_KEY: 'YOUR_GOOGLE_API_KEY',     // Google Cloud Console에서 발급받은 API 키
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/drive.file',
    SCHOOL_FOLDER_NAME: '_School',
    RECORDER_FOLDER_NAME: '9. Recorder WebAPP'
};

// 폴더 ID 캐시
let folderIds = {
    schoolFolderId: null,
    recorderFolderId: null,
    todayFolderId: null
};

// Google Drive API 상태
let gapi = null;
let isGoogleApiLoaded = false;
let isSignedIn = false;
let uploadFolderId = null;

// Google API 초기화
async function initializeGoogleDrive() {
    try {
        console.log('Google Drive API 초기화 중...');
        
        // Google API 스크립트 로드
        await loadGoogleApiScript();
        
        // gapi 초기화
        await new Promise((resolve) => {
            gapi.load('client:auth2', resolve);
        });
        
        // Google API 클라이언트 초기화
        await gapi.client.init({
            apiKey: GOOGLE_DRIVE_CONFIG.API_KEY,
            clientId: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
            discoveryDocs: [GOOGLE_DRIVE_CONFIG.DISCOVERY_DOC],
            scope: GOOGLE_DRIVE_CONFIG.SCOPES
        });
        
        // 인증 상태 확인
        const authInstance = gapi.auth2.getAuthInstance();
        isSignedIn = authInstance.isSignedIn.get();
        
        // 로그인 상태 리스너 추가
        authInstance.isSignedIn.listen(updateSignInStatus);
        
        isGoogleApiLoaded = true;
        console.log('Google Drive API 초기화 완료');
        
        // 업로드 폴더 확인/생성
        if (isSignedIn) {
            await ensureUploadFolder();
        }
        
        return true;
        
    } catch (error) {
        console.error('Google Drive API 초기화 오류:', error);
        throw new Error('Google Drive 연결에 실패했습니다. 인터넷 연결을 확인해주세요.');
    }
}

// Google API 스크립트 동적 로드
function loadGoogleApiScript() {
    return new Promise((resolve, reject) => {
        if (window.gapi) {
            gapi = window.gapi;
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            gapi = window.gapi;
            resolve();
        };
        script.onerror = () => {
            reject(new Error('Google API 스크립트 로드 실패'));
        };
        document.head.appendChild(script);
    });
}

// 로그인 상태 업데이트
function updateSignInStatus(signedIn) {
    isSignedIn = signedIn;
    console.log(`Google Drive 로그인 상태: ${signedIn ? '로그인됨' : '로그아웃됨'}`);
    
    if (signedIn) {
        ensureUploadFolder();
    }
}

// Google Drive 로그인
async function signInToGoogleDrive() {
    try {
        if (!isGoogleApiLoaded) {
            await initializeGoogleDrive();
        }
        
        const authInstance = gapi.auth2.getAuthInstance();
        
        if (!isSignedIn) {
            console.log('Google Drive 로그인 중...');
            await authInstance.signIn();
            showSuccess('Google Drive에 성공적으로 로그인했습니다!');
        }
        
        return true;
        
    } catch (error) {
        console.error('Google Drive 로그인 오류:', error);
        throw new Error('Google Drive 로그인에 실패했습니다.');
    }
}

// 고정된 폴더 구조 생성: _School/9. Recorder WebAPP/오늘날짜/
async function ensureUploadFolder() {
    try {
        console.log('업로드 폴더 구조 생성 중...');
        
        // 1단계: _School 폴더 확인/생성
        folderIds.schoolFolderId = await findOrCreateFolder(GOOGLE_DRIVE_CONFIG.SCHOOL_FOLDER_NAME, null);
        console.log(`_School 폴더: ${folderIds.schoolFolderId}`);
        
        // 2단계: 9. Recorder WebAPP 폴더 확인/생성
        folderIds.recorderFolderId = await findOrCreateFolder(GOOGLE_DRIVE_CONFIG.RECORDER_FOLDER_NAME, folderIds.schoolFolderId);
        console.log(`Recorder WebAPP 폴더: ${folderIds.recorderFolderId}`);
        
        // 3단계: 오늘 날짜 폴더 확인/생성
        const todayFolder = getTodayFolderName();
        folderIds.todayFolderId = await findOrCreateFolder(todayFolder, folderIds.recorderFolderId);
        console.log(`오늘 날짜 폴더 (${todayFolder}): ${folderIds.todayFolderId}`);
        
        uploadFolderId = folderIds.todayFolderId;
        return uploadFolderId;
        
    } catch (error) {
        console.error('폴더 구조 생성 오류:', error);
        throw error;
    }
}

// 폴더 찾기 또는 생성
async function findOrCreateFolder(folderName, parentFolderId = null) {
    try {
        // 부모 폴더 조건 설정
        let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        if (parentFolderId) {
            query += ` and '${parentFolderId}' in parents`;
        } else {
            query += ` and 'root' in parents`;
        }
        
        // 기존 폴더 검색
        const response = await gapi.client.drive.files.list({
            q: query,
            fields: 'files(id, name)'
        });
        
        if (response.result.files.length > 0) {
            return response.result.files[0].id;
        }
        
        // 폴더가 없으면 새로 생성
        const folderResource = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        };
        
        if (parentFolderId) {
            folderResource.parents = [parentFolderId];
        }
        
        const createResponse = await gapi.client.drive.files.create({
            resource: folderResource,
            fields: 'id'
        });
        
        console.log(`새 폴더 생성: ${folderName}`);
        return createResponse.result.id;
        
    } catch (error) {
        console.error(`폴더 생성/확인 오류 (${folderName}):`, error);
        throw error;
    }
}

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
function getTodayFolderName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 현재 저장 경로 정보 반환
function getCurrentSavePath() {
    const today = getTodayFolderName();
    return `_School/9. Recorder WebAPP/${today}/`;
}

// Google Drive에 파일 업로드
async function uploadToGoogleDrive(blob, filename, onProgress = null) {
    try {
        // Google Drive 로그인 확인
        if (!isSignedIn) {
            await signInToGoogleDrive();
        }
        
        // 업로드 폴더 확인
        if (!uploadFolderId) {
            await ensureUploadFolder();
        }
        
        console.log(`Google Drive 업로드 시작: ${filename}`);
        
        // 메타데이터 준비
        const metadata = {
            name: filename,
            parents: [uploadFolderId]
        };
        
        // FormData로 멀티파트 업로드 준비
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
        form.append('file', blob);
        
        // 업로드 요청
        const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,webViewLink', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`
            },
            body: form
        });
        
        if (!uploadResponse.ok) {
            throw new Error(`업로드 실패: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
        
        const result = await uploadResponse.json();
        console.log(`업로드 완료: ${result.name} (${result.id})`);
        
        return {
            fileId: result.id,
            fileName: result.name,
            fileSize: result.size,
            webViewLink: result.webViewLink
        };
        
    } catch (error) {
        console.error('Google Drive 업로드 오류:', error);
        throw error;
    }
}

// 진행률을 포함한 업로드 (XMLHttpRequest 사용)
async function uploadToGoogleDriveWithProgress(blob, filename, onProgress = null) {
    return new Promise(async (resolve, reject) => {
        try {
            // Google Drive 로그인 확인
            if (!isSignedIn) {
                await signInToGoogleDrive();
            }
            
            // 업로드 폴더 확인
            if (!uploadFolderId) {
                await ensureUploadFolder();
            }
            
            const metadata = {
                name: filename,
                parents: [uploadFolderId]
            };
            
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
            form.append('file', blob);
            
            const xhr = new XMLHttpRequest();
            
            // 진행률 이벤트
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percentage = Math.round((e.loaded / e.total) * 100);
                    onProgress(percentage, e.loaded, e.total);
                }
            });
            
            // 완료 이벤트
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        resolve({
                            fileId: result.id,
                            fileName: result.name,
                            fileSize: result.size,
                            webViewLink: result.webViewLink
                        });
                    } catch (parseError) {
                        reject(new Error('응답 파싱 오류: ' + parseError.message));
                    }
                } else {
                    reject(new Error(`업로드 실패: ${xhr.status} ${xhr.statusText}`));
                }
            });
            
            // 오류 이벤트
            xhr.addEventListener('error', () => {
                reject(new Error('네트워크 오류로 업로드 실패'));
            });
            
            // 업로드 시작
            xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,webViewLink');
            xhr.setRequestHeader('Authorization', `Bearer ${gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`);
            xhr.send(form);
            
        } catch (error) {
            reject(error);
        }
    });
}

// 여러 파일 동시 업로드
async function uploadMultipleFiles(files, onProgress = null) {
    try {
        const uploadPromises = files.map(async (fileInfo, index) => {
            const { blob, filename } = fileInfo;
            
            const fileProgress = (percentage, loaded, total) => {
                if (onProgress) {
                    onProgress(index, percentage, loaded, total, filename);
                }
            };
            
            return await uploadToGoogleDriveWithProgress(blob, filename, fileProgress);
        });
        
        const results = await Promise.all(uploadPromises);
        return results;
        
    } catch (error) {
        console.error('다중 파일 업로드 오류:', error);
        throw error;
    }
}

// Google Drive 폴더 링크 가져오기
async function getDriveFolderLink() {
    try {
        if (uploadFolderId) {
            return `https://drive.google.com/drive/folders/${uploadFolderId}`;
        }
        return null;
    } catch (error) {
        console.error('폴더 링크 가져오기 오류:', error);
        return null;
    }
}

// 공개 설정
async function makeFilePublic(fileId) {
    try {
        await gapi.client.drive.permissions.create({
            fileId: fileId,
            resource: {
                role: 'reader',
                type: 'anyone'
            }
        });
        return true;
    } catch (error) {
        console.error('파일 공개 설정 오류:', error);
        return false;
    }
}

console.log('Google Drive API 모듈 로드 완료'); 
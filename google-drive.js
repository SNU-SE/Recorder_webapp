// Google Drive API 설정
const GOOGLE_DRIVE_CONFIG = {
    CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID', // Google Cloud Console에서 발급받은 클라이언트 ID
    API_KEY: 'YOUR_GOOGLE_API_KEY',     // Google Cloud Console에서 발급받은 API 키
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/drive.file',
    DEFAULT_FOLDER_NAME: '화면_웹캠_녹화' // 기본 폴더명
};

// 사용자 설정 저장소
let userSettings = {
    customFolderName: null,
    useCustomFolder: false,
    selectedFolderId: null
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
        
        // 사용자 설정 로드
        loadUserSettings();
        
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

// 업로드 폴더 확인/생성
async function ensureUploadFolder() {
    try {
        console.log('업로드 폴더 확인 중...');
        
        // 사용할 폴더명 결정
        const folderName = getCurrentFolderName();
        
        // 사용자가 특정 폴더를 선택했다면 그것을 사용
        if (userSettings.selectedFolderId) {
            uploadFolderId = userSettings.selectedFolderId;
            console.log(`선택된 폴더 사용: ${uploadFolderId}`);
            return uploadFolderId;
        }
        
        // 기존 폴더 검색
        const response = await gapi.client.drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)'
        });
        
        if (response.result.files.length > 0) {
            uploadFolderId = response.result.files[0].id;
            console.log(`기존 폴더 사용: ${folderName} (${uploadFolderId})`);
        } else {
            // 새 폴더 생성
            const folderResponse = await gapi.client.drive.files.create({
                resource: {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });
            
            uploadFolderId = folderResponse.result.id;
            console.log(`새 폴더 생성: ${folderName} (${uploadFolderId})`);
        }
        
        return uploadFolderId;
        
    } catch (error) {
        console.error('폴더 생성/확인 오류:', error);
        throw error;
    }
}

// 현재 사용할 폴더명 가져오기
function getCurrentFolderName() {
    if (userSettings.useCustomFolder && userSettings.customFolderName) {
        return userSettings.customFolderName;
    }
    return GOOGLE_DRIVE_CONFIG.DEFAULT_FOLDER_NAME;
}

// 사용자 정의 폴더명 설정
function setCustomFolderName(folderName) {
    userSettings.customFolderName = folderName;
    userSettings.useCustomFolder = true;
    uploadFolderId = null; // 다음 업로드 시 새 폴더 사용
    
    // 로컬 스토리지에 저장
    try {
        localStorage.setItem('recorder_settings', JSON.stringify(userSettings));
        console.log(`사용자 정의 폴더명 설정: ${folderName}`);
    } catch (error) {
        console.warn('설정 저장 실패:', error);
    }
}

// 기본 폴더명으로 되돌리기
function resetToDefaultFolder() {
    userSettings.useCustomFolder = false;
    userSettings.customFolderName = null;
    userSettings.selectedFolderId = null;
    uploadFolderId = null;
    
    try {
        localStorage.setItem('recorder_settings', JSON.stringify(userSettings));
        console.log('기본 폴더명으로 재설정');
    } catch (error) {
        console.warn('설정 저장 실패:', error);
    }
}

// 기존 Google Drive 폴더 선택
async function selectExistingFolder() {
    try {
        if (!isSignedIn) {
            await signInToGoogleDrive();
        }
        
        // 사용자의 폴더 목록 가져오기
        const response = await gapi.client.drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name, parents)',
            orderBy: 'name'
        });
        
        const folders = response.result.files;
        
        if (folders.length === 0) {
            showError('Google Drive에 폴더가 없습니다.');
            return null;
        }
        
        // 폴더 선택 UI 생성
        const folderId = await showFolderSelectionDialog(folders);
        
        if (folderId) {
            userSettings.selectedFolderId = folderId;
            uploadFolderId = folderId;
            
            try {
                localStorage.setItem('recorder_settings', JSON.stringify(userSettings));
            } catch (error) {
                console.warn('설정 저장 실패:', error);
            }
            
            const selectedFolder = folders.find(f => f.id === folderId);
            showSuccess(`폴더가 선택되었습니다: ${selectedFolder.name}`);
            return folderId;
        }
        
        return null;
        
    } catch (error) {
        console.error('폴더 선택 오류:', error);
        showError('폴더 선택 중 오류가 발생했습니다.');
        return null;
    }
}

// 폴더 선택 다이얼로그 표시
function showFolderSelectionDialog(folders) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'folder-selection-dialog';
        dialog.innerHTML = `
            <div class="dialog-backdrop">
                <div class="dialog-content">
                    <h3>Google Drive 폴더 선택</h3>
                    <div class="folder-list">
                        ${folders.map(folder => `
                            <div class="folder-item" data-folder-id="${folder.id}">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="#4285f4"/>
                                </svg>
                                <span>${folder.name}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="dialog-buttons">
                        <button class="btn btn-secondary" id="cancelFolder">취소</button>
                        <button class="btn btn-primary" id="selectFolder" disabled>선택</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        let selectedFolderId = null;
        
        // 폴더 선택 이벤트
        dialog.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', () => {
                dialog.querySelectorAll('.folder-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                selectedFolderId = item.dataset.folderId;
                document.getElementById('selectFolder').disabled = false;
            });
        });
        
        // 버튼 이벤트
        document.getElementById('cancelFolder').addEventListener('click', () => {
            document.body.removeChild(dialog);
            resolve(null);
        });
        
        document.getElementById('selectFolder').addEventListener('click', () => {
            document.body.removeChild(dialog);
            resolve(selectedFolderId);
        });
    });
}

// 설정 로드
function loadUserSettings() {
    try {
        const saved = localStorage.getItem('recorder_settings');
        if (saved) {
            userSettings = { ...userSettings, ...JSON.parse(saved) };
            console.log('사용자 설정 로드됨:', userSettings);
        }
    } catch (error) {
        console.warn('설정 로드 실패:', error);
    }
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
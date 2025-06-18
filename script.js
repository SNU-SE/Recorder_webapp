// Global variables
let webcamStream = null;
let screenStream = null;
let webcamRecorder = null;
let screenRecorder = null;
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;
let recordedChunks = {
    webcam: [],
    screen: []
};

// DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const recordingTime = document.getElementById('recordingTime');
const webcamPreview = document.getElementById('webcamPreview');
const screenPreview = document.getElementById('screenPreview');
const uploadStatus = document.getElementById('uploadStatus');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('화면 & 웹캠 녹화기 초기화 중...');
    initializeApp();
});

// Initialize application
async function initializeApp() {
    try {
        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('이 브라우저는 미디어 녹화를 지원하지 않습니다.');
        }

        // Add event listeners
        startBtn.addEventListener('click', startRecording);
        stopBtn.addEventListener('click', stopRecording);

        // Google Drive 설정 확인 (초기에)
        setTimeout(() => {
            checkGoogleDriveConfig();
        }, 500);

        // Initialize Google Drive API (non-blocking)
        initializeGoogleDriveAsync();

        // Initial UI state
        updateUI('ready');
        
        console.log('앱 초기화 완료');
    } catch (error) {
        console.error('앱 초기화 오류:', error);
        showError('앱을 초기화하는 중 오류가 발생했습니다: ' + error.message);
    }
}

// Google Drive 비동기 초기화 (에러가 발생해도 앱 실행에 영향 없음)
async function initializeGoogleDriveAsync() {
    try {
        console.log('Google Drive API 초기화 시작...');
        
        // Google Drive API가 로드될 때까지 대기
        let attempts = 0;
        const maxAttempts = 5;
        
        const waitForAPI = () => {
            return new Promise((resolve, reject) => {
                const checkAPI = () => {
                    attempts++;
                    console.log(`Google Drive API 로드 확인 시도 ${attempts}/${maxAttempts}`);
                    
                    if (typeof initializeGoogleDrive === 'function') {
                        console.log('Google Drive API 함수 발견!');
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        reject(new Error('Google Drive API 로드 시간 초과'));
                    } else {
                        setTimeout(checkAPI, 1000);
                    }
                };
                checkAPI();
            });
        };
        
        await waitForAPI();
        
        // Google Drive 초기화 실행
        await initializeGoogleDrive();
        console.log('✅ Google Drive 연동 준비 완료');
        
        // UI 업데이트
        if (typeof updateUIAfterGoogleDriveInit === 'function') {
            updateUIAfterGoogleDriveInit();
        }
        
    } catch (error) {
        console.warn('⚠️ Google Drive 초기화 실패:', error.message);
        
        // API 키 관련 오류인지 확인
        if (error.message.includes('YOUR_GOOGLE') || error.message.includes('API')) {
            console.error('🔑 Google Drive API 키가 설정되지 않았습니다.');
            showError('Google Drive API 키가 설정되지 않았습니다. 관리자에게 문의하세요.');
        }
    }
}

// Start recording function
async function startRecording() {
    try {
        updateUI('preparing');
        console.log('녹화 시작 준비 중...');
        
        // Check HTTPS requirement
        if (!checkHTTPS()) {
            throw new Error('HTTPS 환경에서만 녹화가 가능합니다.');
        }
        
        // Step 1: Get webcam stream
        console.log('웹캠 접근 중...');
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                facingMode: 'user'
            },
            audio: true
        });
        
        // Connect webcam to preview
        webcamPreview.srcObject = webcamStream;
        console.log('웹캠 연결 완료');
        
        // Step 2: Get screen share stream (full screen only)
        console.log('전체 화면 녹화 접근 중...');
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { 
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                displaySurface: 'monitor',
                logicalSurface: true,
                cursor: 'always'
            },
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                sampleRate: 44100
            },
            preferCurrentTab: false,
            selfBrowserSurface: 'exclude',
            surfaceSwitching: 'exclude',
            systemAudio: 'include'
        });
        
        // Connect screen to preview
        screenPreview.srcObject = screenStream;
        console.log('전체 화면 녹화 연결 완료');
        
        // Step 3: Setup MediaRecorders
        await setupMediaRecorders();
        
        // Step 4: Start recording
        webcamRecorder.start(1000); // Collect data every second
        screenRecorder.start(1000);
        
        // Start timer
        recordingStartTime = Date.now();
        startTimer();
        
        // Update UI
        updateUI('recording');
        isRecording = true;
        
        console.log('녹화 시작됨');
        
        // Handle stream end events
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
            console.log('전체 화면 녹화가 중단되었습니다.');
            stopRecording();
        });
        
    } catch (error) {
        console.error('녹화 시작 오류:', error);
        const userMessage = handleMediaError(error);
        showError(userMessage);
        await cleanupStreams();
        updateUI('ready');
    }
}

// Stop recording function
async function stopRecording() {
    try {
        updateUI('stopping');
        console.log('녹화 중지 중...');
        
        // Stop recording
        if (webcamRecorder && webcamRecorder.state === 'recording') {
            webcamRecorder.stop();
        }
        if (screenRecorder && screenRecorder.state === 'recording') {
            screenRecorder.stop();
        }
        
        // Stop timer
        stopTimer();
        
        // Wait for recording to finish
        await Promise.all([
            new Promise(resolve => {
                if (webcamRecorder && webcamRecorder.state !== 'inactive') {
                    webcamRecorder.addEventListener('stop', resolve, { once: true });
                } else {
                    resolve();
                }
            }),
            new Promise(resolve => {
                if (screenRecorder && screenRecorder.state !== 'inactive') {
                    screenRecorder.addEventListener('stop', resolve, { once: true });
                } else {
                    resolve();
                }
            })
        ]);
        
        // Process recorded data
        await processRecordedFiles();
        
        // Cleanup streams
        await cleanupStreams();
        
        // Update UI
        updateUI('ready');
        isRecording = false;
        
        console.log('녹화 중지 완료');
        showSuccess('녹화가 완료되었습니다! 파일이 자동으로 다운로드됩니다.');
        
        // Google Drive 업로드 시작
        await uploadFilesToGoogleDrive();
        
    } catch (error) {
        console.error('녹화 중지 오류:', error);
        showError('녹화를 중지하는 중 오류가 발생했습니다: ' + error.message);
        await cleanupStreams();
        updateUI('ready');
    }
}

// Update UI based on current state
function updateUI(state) {
    const statusDot = statusIndicator.querySelector('.status-dot');
    
    switch (state) {
        case 'ready':
            statusText.textContent = '대기 중';
            statusDot.className = 'status-dot';
            startBtn.disabled = false;
            stopBtn.disabled = true;
            uploadStatus.style.display = 'none';
            break;
            
        case 'preparing':
            statusText.textContent = '준비 중...';
            statusDot.className = 'status-dot';
            startBtn.disabled = true;
            stopBtn.disabled = true;
            break;
            
        case 'recording':
            statusText.textContent = '녹화 중';
            statusDot.className = 'status-dot recording';
            startBtn.disabled = true;
            stopBtn.disabled = false;
            break;
            
        case 'stopping':
            statusText.textContent = '중지 중...';
            statusDot.className = 'status-dot';
            startBtn.disabled = true;
            stopBtn.disabled = true;
            break;
            
        case 'uploading':
            statusText.textContent = '업로드 중';
            statusDot.className = 'status-dot';
            startBtn.disabled = true;
            stopBtn.disabled = true;
            uploadStatus.style.display = 'block';
            break;
    }
}

// Start recording timer
function startTimer() {
    timerInterval = setInterval(() => {
        if (recordingStartTime) {
            const elapsed = Date.now() - recordingStartTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            recordingTime.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

// Stop recording timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    recordingTime.textContent = '00:00:00';
    recordingStartTime = null;
}

// Show error message with modern notification
function showError(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <div class="notification-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#f56565"/>
                <path d="M15 9l-6 6M9 9l6 6" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

// Show success message
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <div class="notification-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#48bb78"/>
                <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Update upload progress (for Phase 3)
function updateUploadProgress(percentage, text = '업로드 중...') {
    progressFill.style.width = percentage + '%';
    progressText.textContent = text;
}

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Check if running on HTTPS (required for media APIs)
function checkHTTPS() {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.warn('HTTPS가 필요합니다. 미디어 API는 보안 컨텍스트에서만 동작합니다.');
        return false;
    }
    return true;
}

// Setup MediaRecorder instances
async function setupMediaRecorders() {
    try {
        // Setup webcam recorder
        const webcamOptions = {
            mimeType: 'video/webm;codecs=vp9,opus'
        };
        
        // Fallback to vp8 if vp9 is not supported
        if (!MediaRecorder.isTypeSupported(webcamOptions.mimeType)) {
            webcamOptions.mimeType = 'video/webm;codecs=vp8,opus';
        }
        
        webcamRecorder = new MediaRecorder(webcamStream, webcamOptions);
        recordedChunks.webcam = [];
        
        webcamRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0) {
                recordedChunks.webcam.push(event.data);
            }
        });
        
        webcamRecorder.addEventListener('stop', () => {
            console.log('웹캠 녹화 중지됨');
        });
        
        // Setup screen recorder
        const screenOptions = {
            mimeType: 'video/webm;codecs=vp9,opus'
        };
        
        if (!MediaRecorder.isTypeSupported(screenOptions.mimeType)) {
            screenOptions.mimeType = 'video/webm;codecs=vp8,opus';
        }
        
        screenRecorder = new MediaRecorder(screenStream, screenOptions);
        recordedChunks.screen = [];
        
        screenRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0) {
                recordedChunks.screen.push(event.data);
            }
        });
        
        screenRecorder.addEventListener('stop', () => {
            console.log('화면 녹화 중지됨');
        });
        
        console.log('MediaRecorder 설정 완료');
        
    } catch (error) {
        console.error('MediaRecorder 설정 오류:', error);
        throw error;
    }
}

// Process recorded files
async function processRecordedFiles() {
    try {
        console.log('녹화 파일 처리 중...');
        
        // Create webcam blob
        if (recordedChunks.webcam.length > 0) {
            const webcamBlob = new Blob(recordedChunks.webcam, { type: 'video/webm' });
            const webcamUrl = URL.createObjectURL(webcamBlob);
            
            console.log(`웹캠 파일 생성: ${formatFileSize(webcamBlob.size)}`);
            
            // Create download link for webcam
            createDownloadLink(webcamBlob, `웹캠_녹화_${getCurrentTimestamp()}.webm`);
        }
        
        // Create screen blob
        if (recordedChunks.screen.length > 0) {
            const screenBlob = new Blob(recordedChunks.screen, { type: 'video/webm' });
            const screenUrl = URL.createObjectURL(screenBlob);
            
            console.log(`화면 파일 생성: ${formatFileSize(screenBlob.size)}`);
            
            // Create download link for screen
            createDownloadLink(screenBlob, `화면_녹화_${getCurrentTimestamp()}.webm`);
        }
        
        // recordedChunks는 Google Drive 업로드 후에 초기화됨
        
    } catch (error) {
        console.error('파일 처리 오류:', error);
        throw error;
    }
}

// Create download link for recorded files
function createDownloadLink(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the URL after a delay
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}

// Cleanup media streams
async function cleanupStreams() {
    try {
        // Stop webcam stream
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => {
                track.stop();
            });
            webcamStream = null;
            webcamPreview.srcObject = null;
        }
        
        // Stop screen stream
        if (screenStream) {
            screenStream.getTracks().forEach(track => {
                track.stop();
            });
            screenStream = null;
            screenPreview.srcObject = null;
        }
        
        // Reset recorders
        webcamRecorder = null;
        screenRecorder = null;
        
        console.log('스트림 정리 완료');
        
    } catch (error) {
        console.error('스트림 정리 오류:', error);
    }
}

// Get current timestamp for file naming
function getCurrentTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// Enhanced error handling for media access
function handleMediaError(error) {
    let userMessage = '알 수 없는 오류가 발생했습니다.';
    
    switch (error.name) {
        case 'NotAllowedError':
            userMessage = '카메라 또는 화면 녹화 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.';
            break;
        case 'NotFoundError':
            userMessage = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.';
            break;
        case 'NotSupportedError':
            userMessage = '이 브라우저는 미디어 녹화를 지원하지 않습니다.';
            break;
        case 'AbortError':
            userMessage = '미디어 접근이 중단되었습니다.';
            break;
        case 'NotReadableError':
            userMessage = '카메라가 다른 애플리케이션에서 사용 중입니다.';
            break;
        default:
            userMessage = `미디어 접근 오류: ${error.message}`;
    }
    
    return userMessage;
}

// Google Drive 업로드 처리
async function uploadFilesToGoogleDrive() {
    try {
        console.log('=== Google Drive 업로드 시작 ===');
        
        // Google Drive API 사용 가능 여부 확인
        console.log('uploadMultipleFiles 함수 체크:', typeof uploadMultipleFiles);
        console.log('isGoogleApiLoaded 상태:', typeof isGoogleApiLoaded !== 'undefined' ? isGoogleApiLoaded : 'undefined');
        console.log('isSignedIn 상태:', typeof isSignedIn !== 'undefined' ? isSignedIn : 'undefined');
        
        if (typeof uploadMultipleFiles !== 'function') {
            console.warn('Google Drive API가 로드되지 않았습니다. 로컬 다운로드만 진행됩니다.');
            console.warn('가능한 원인: API 키 미설정, 네트워크 오류, 스크립트 로드 실패');
            
            // API 키 상태 확인
            if (typeof GOOGLE_DRIVE_CONFIG !== 'undefined') {
                if (GOOGLE_DRIVE_CONFIG.CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID' || 
                    GOOGLE_DRIVE_CONFIG.API_KEY === 'YOUR_GOOGLE_API_KEY') {
                    showError('Google Drive API 키가 설정되지 않았습니다. GitHub Secrets를 확인해주세요.');
                } else {
                    showError('Google Drive API 로드에 실패했습니다. 네트워크를 확인하고 페이지를 새로고침해주세요.');
                }
            } else {
                showError('Google Drive 설정을 찾을 수 없습니다. 관리자에게 문의하세요.');
            }
            return;
        }
        
        // Google Drive API 초기화 여부 확인
        if (typeof isGoogleApiLoaded !== 'undefined' && !isGoogleApiLoaded) {
            console.warn('Google Drive API가 초기화되지 않았습니다.');
            showError('Google Drive API가 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        
        // 로그인 상태 확인 및 로그인 시도
        if (typeof isSignedIn !== 'undefined' && !isSignedIn) {
            console.log('Google Drive 로그인 시도 중...');
            if (typeof signInToGoogleDrive === 'function') {
                await signInToGoogleDrive();
                console.log('Google Drive 로그인 완료');
            } else {
                throw new Error('Google Drive 로그인 함수를 찾을 수 없습니다.');
            }
        }

        // 업로드할 파일 준비
        console.log('=== recordedChunks 상태 확인 ===');
        console.log('recordedChunks:', recordedChunks);
        console.log('webcam chunks 길이:', recordedChunks.webcam ? recordedChunks.webcam.length : 'undefined');
        console.log('screen chunks 길이:', recordedChunks.screen ? recordedChunks.screen.length : 'undefined');
        
        const filesToUpload = [];
        
        if (recordedChunks.webcam && recordedChunks.webcam.length > 0) {
            const webcamBlob = new Blob(recordedChunks.webcam, { type: 'video/webm' });
            console.log('웹캠 파일 준비:', webcamBlob.size, 'bytes');
            filesToUpload.push({
                blob: webcamBlob,
                filename: `웹캠_녹화_${getCurrentTimestamp()}.webm`
            });
        } else {
            console.warn('웹캠 recordedChunks가 비어있습니다.');
        }
        
        if (recordedChunks.screen && recordedChunks.screen.length > 0) {
            const screenBlob = new Blob(recordedChunks.screen, { type: 'video/webm' });
            console.log('화면 파일 준비:', screenBlob.size, 'bytes');
            filesToUpload.push({
                blob: screenBlob,
                filename: `전체화면_녹화_${getCurrentTimestamp()}.webm`
            });
        } else {
            console.warn('화면 recordedChunks가 비어있습니다.');
        }

        console.log('업로드 준비된 파일 수:', filesToUpload.length);
        
        if (filesToUpload.length === 0) {
            console.error('❌ 업로드할 파일이 없습니다. recordedChunks 상태를 확인하세요.');
            showError('녹화된 파일을 찾을 수 없습니다. 다시 녹화해주세요.');
            return;
        }

        // 업로드 시작
        updateUI('uploading');
        console.log(`Google Drive에 ${filesToUpload.length}개 파일 업로드 시작`);

        let totalFiles = filesToUpload.length;
        let completedFiles = 0;

        // 진행률 콜백
        const onProgress = (fileIndex, percentage, loaded, total, filename) => {
            const overallProgress = Math.round(((completedFiles + (percentage / 100)) / totalFiles) * 100);
            updateUploadProgress(overallProgress, `업로드 중: ${filename} (${percentage}%)`);
            
            if (percentage === 100) {
                completedFiles++;
            }
        };

        // 업로드 실행
        const uploadResults = await uploadMultipleFiles(filesToUpload, onProgress);
        
        // 업로드 완료 처리
        console.log('Google Drive 업로드 완료:', uploadResults);
        
        const folderLink = await getDriveFolderLink();
        const successMessage = folderLink 
            ? `Google Drive 업로드 완료! <a href="${folderLink}" target="_blank">폴더 보기</a>`
            : 'Google Drive 업로드 완료!';
            
        showUploadSuccess(successMessage);
        
        // 업로드 완료 후 recordedChunks 초기화
        recordedChunks.webcam = [];
        recordedChunks.screen = [];
        console.log('recordedChunks 초기화 완료');

    } catch (error) {
        console.error('Google Drive 업로드 오류:', error);
        handleUploadError(error);
        
        // 오류 발생 시에도 초기화 (메모리 절약)
        recordedChunks.webcam = [];
        recordedChunks.screen = [];
    }
}

// 업로드 성공 메시지 (HTML 포함)
function showUploadSuccess(htmlMessage) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <div class="notification-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#48bb78"/>
                <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${htmlMessage}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

// 업로드 에러 처리
function handleUploadError(error) {
    let errorMessage = 'Google Drive 업로드 중 오류가 발생했습니다.';
    
    if (error.message.includes('로그인')) {
        errorMessage = 'Google Drive에 로그인해주세요. 브라우저가 팝업을 차단했을 수 있습니다.';
    } else if (error.message.includes('권한')) {
        errorMessage = 'Google Drive 접근 권한이 필요합니다. 권한을 허용해주세요.';
    } else if (error.message.includes('네트워크')) {
        errorMessage = '네트워크 연결을 확인하고 다시 시도해주세요.';
    } else if (error.message.includes('용량')) {
        errorMessage = 'Google Drive 저장 공간이 부족합니다.';
    }
    
    showError(errorMessage + ' 파일은 로컬에 다운로드되었습니다.');
    updateUI('ready');
}

// 수동 Google Drive 업로드 (추후 버튼 추가용)
async function manualUploadToGoogleDrive() {
    try {
        if (!isSignedIn && typeof signInToGoogleDrive === 'function') {
            await signInToGoogleDrive();
        }
        
        showSuccess('Google Drive 연동이 완료되었습니다!');
        
    } catch (error) {
        console.error('수동 Google Drive 연동 오류:', error);
        showError('Google Drive 연동에 실패했습니다.');
    }
}

// Google Drive API 설정 확인
function checkGoogleDriveConfig() {
    console.log('=== Google Drive 설정 확인 ===');
    
    if (typeof GOOGLE_DRIVE_CONFIG !== 'undefined') {
        console.log('GOOGLE_DRIVE_CONFIG 존재:', true);
        console.log('CLIENT_ID:', GOOGLE_DRIVE_CONFIG.CLIENT_ID?.substring(0, 20) + '...');
        console.log('API_KEY:', GOOGLE_DRIVE_CONFIG.API_KEY?.substring(0, 10) + '...');
        
        // API 키가 기본값인지 확인
        if (GOOGLE_DRIVE_CONFIG.CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
            console.error('❌ CLIENT_ID가 기본값입니다. GitHub Secrets 설정을 확인하세요.');
            return false;
        }
        
        if (GOOGLE_DRIVE_CONFIG.API_KEY === 'YOUR_GOOGLE_API_KEY') {
            console.error('❌ API_KEY가 기본값입니다. GitHub Secrets 설정을 확인하세요.');
            return false;
        }
        
        console.log('✅ Google Drive 설정 확인 완료');
        return true;
    } else {
        console.error('❌ GOOGLE_DRIVE_CONFIG를 찾을 수 없습니다.');
        return false;
    }
}

// Google Drive API 로드 후 UI 업데이트 (저장 경로 정보 표시)
function updateUIAfterGoogleDriveInit() {
    console.log('Google Drive 연동 준비 완료 - 고정 폴더 구조 사용');
    
    // 설정 확인
    checkGoogleDriveConfig();
}

console.log('Script loaded successfully'); 
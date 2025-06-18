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
        showInfo('녹화를 시작합니다. 잠시만 기다려주세요...', 3000);
        
        // Check HTTPS requirement
        if (!checkHTTPS()) {
            throw new Error('HTTPS 환경에서만 녹화가 가능합니다.');
        }
        
        // Step 1: Get webcam stream
        console.log('웹캠 접근 중...');
        showInfo('웹캠에 접근하고 있습니다...', 2000);
        updateStatusMonitor('connecting', 'ready', 'preparing');
        
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
        showInfo('웹캠 연결 완료! 이제 화면 공유를 설정합니다...', 2000);
        updateStatusMonitor('completed', 'connecting', 'preparing');
        
        // Step 2: Get screen share stream (full screen only)
        console.log('전체 화면 녹화 접근 중...');
        showWarning('화면 공유 권한을 요청합니다. 전체 화면을 선택해주세요.', 4000);
        
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
        showSuccess('화면 공유 설정 완료! 녹화를 시작합니다...', 2000);
        updateStatusMonitor('completed', 'completed', 'recording');
        
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
        showSuccess('✅ 녹화가 성공적으로 시작되었습니다!', 3000);
        
        // Handle stream end events
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
            console.log('전체 화면 녹화가 중단되었습니다.');
            showWarning('화면 공유가 중단되어 녹화를 종료합니다.', 3000);
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
        showInfo('녹화를 중지하고 파일을 처리하고 있습니다...', 3000);
        
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

// Update UI based on current state (Phase 4: Enhanced)
function updateUI(state) {
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusMonitor = document.getElementById('statusMonitor');
    
    switch (state) {
        case 'ready':
            statusText.textContent = '대기 중';
            statusDot.className = 'status-dot';
            startBtn.disabled = false;
            stopBtn.disabled = true;
            uploadStatus.style.display = 'none';
            statusMonitor.style.display = 'none';
            updateStatusMonitor('ready', 'ready', 'ready');
            break;
            
        case 'preparing':
            statusText.textContent = '준비 중...';
            statusDot.className = 'status-dot';
            startBtn.disabled = true;
            stopBtn.disabled = true;
            statusMonitor.style.display = 'grid';
            updateStatusMonitor('connecting', 'connecting', 'preparing');
            break;
            
        case 'recording':
            statusText.textContent = '녹화 중';
            statusDot.className = 'status-dot recording';
            startBtn.disabled = true;
            stopBtn.disabled = false;
            statusMonitor.style.display = 'grid';
            updateStatusMonitor('active', 'active', 'recording');
            break;
            
        case 'stopping':
            statusText.textContent = '중지 중...';
            statusDot.className = 'status-dot';
            startBtn.disabled = true;
            stopBtn.disabled = true;
            updateStatusMonitor('stopping', 'stopping', 'processing');
            break;
            
        case 'uploading':
            statusText.textContent = '업로드 중';
            statusDot.className = 'status-dot';
            startBtn.disabled = true;
            stopBtn.disabled = true;
            uploadStatus.style.display = 'block';
            updateStatusMonitor('completed', 'completed', 'uploading');
            break;
    }
}

// Phase 4: 상태 모니터 업데이트 함수
function updateStatusMonitor(webcamState, screenState, storageState) {
    const webcamStatus = document.getElementById('webcamStatus');
    const screenStatus = document.getElementById('screenStatus');
    const storageStatus = document.getElementById('storageStatus');
    
    if (!webcamStatus || !screenStatus || !storageStatus) return;
    
    // 웹캠 상태 업데이트
    updateMonitorItem(webcamStatus, webcamState, {
        'ready': '대기',
        'connecting': '연결중',
        'active': '녹화중',
        'stopping': '중지중',
        'completed': '완료',
        'error': '오류'
    });
    
    // 화면 상태 업데이트
    updateMonitorItem(screenStatus, screenState, {
        'ready': '대기',
        'connecting': '연결중',
        'active': '녹화중',
        'stopping': '중지중',
        'completed': '완료',
        'error': '오류'
    });
    
    // 저장 상태 업데이트
    updateMonitorItem(storageStatus, storageState, {
        'ready': '준비',
        'preparing': '준비중',
        'recording': '저장중',
        'processing': '처리중',
        'uploading': '업로드중',
        'completed': '완료',
        'error': '오류'
    });
}

// 개별 모니터 아이템 업데이트
function updateMonitorItem(element, state, stateTexts) {
    element.textContent = stateTexts[state] || state;
    element.className = 'monitor-value';
    
    if (state === 'active' || state === 'recording' || state === 'uploading') {
        element.classList.add('active');
    } else if (state === 'error') {
        element.classList.add('error');
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
function showSuccess(message, duration = 5000) {
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
    }, duration);
}

// Show info message
function showInfo(message, duration = 7000) {
    const notification = document.createElement('div');
    notification.className = 'notification info';
    notification.innerHTML = `
        <div class="notification-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#4299e1"/>
                <path d="M12 16v-4M12 8h.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
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
    }, duration);
}

// Show warning message
function showWarning(message, duration = 8000) {
    const notification = document.createElement('div');
    notification.className = 'notification warning';
    notification.innerHTML = `
        <div class="notification-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#ed8936"/>
                <line x1="12" y1="9" x2="12" y2="13" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" stroke="white" stroke-width="2" stroke-linecap="round"/>
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
    }, duration);
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

// Phase 4: 향상된 미디어 에러 처리
function handleMediaError(error) {
    console.error('미디어 접근 오류 상세:', error);
    
    let userMessage = '⚠️ 알 수 없는 오류가 발생했습니다.';
    
    switch (error.name) {
        case 'NotAllowedError':
            userMessage = '🚫 카메라 또는 화면 녹화 권한이 거부되었습니다.\n💡 브라우저 주소창의 🎥 아이콘을 클릭하여 권한을 허용해주세요.';
            break;
        case 'NotFoundError':
            userMessage = '📷 카메라를 찾을 수 없습니다.\n💡 카메라가 연결되어 있고 다른 프로그램에서 사용중이 아닌지 확인해주세요.';
            break;
        case 'NotSupportedError':
            userMessage = '❌ 이 브라우저는 미디어 녹화를 지원하지 않습니다.\n💡 Chrome, Firefox, Edge 등의 최신 브라우저를 사용해주세요.';
            break;
        case 'AbortError':
            userMessage = '❌ 화면 공유가 취소되었습니다.\n💡 화면 공유를 허용한 후 다시 시도해주세요.';
            break;
        case 'NotReadableError':
            userMessage = '🔒 카메라가 다른 애플리케이션에서 사용 중입니다.\n💡 다른 프로그램을 종료하고 다시 시도해주세요.';
            break;
        case 'OverconstrainedError':
            userMessage = '⚙️ 요청한 미디어 설정을 지원하지 않습니다.\n💡 다른 해상도나 설정으로 다시 시도해주세요.';
            break;
        case 'SecurityError':
            userMessage = '🔒 보안 정책으로 인해 녹화할 수 없습니다.\n💡 HTTPS 환경에서만 녹화가 가능합니다.';
            break;
        case 'TypeError':
            if (error.message.includes('getDisplayMedia')) {
                userMessage = '🖥️ 화면 공유 기능을 사용할 수 없습니다.\n💡 최신 브라우저에서 시도하거나 HTTPS 환경인지 확인해주세요.';
            } else {
                userMessage = `⚠️ 미디어 접근 오류가 발생했습니다.\n📋 오류 상세: ${error.message}`;
            }
            break;
        default:
            userMessage = `⚠️ 미디어 접근 오류가 발생했습니다.\n📋 오류 상세: ${error.message}`;
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

// 업로드 에러 처리 (Phase 4: 개선된 에러 핸들링)
function handleUploadError(error) {
    console.error('❌ Google Drive 업로드 오류:', error);
    
    let errorMessage = '⚠️ Google Drive 업로드 중 오류가 발생했습니다.';
    let suggestion = '';
    
    if (error.message.includes('401') || error.message.includes('로그인')) {
        errorMessage = '🔐 Google Drive 인증이 만료되었습니다.';
        suggestion = '브라우저를 새로고침한 후 다시 시도해주세요.';
    } else if (error.message.includes('403') || error.message.includes('권한')) {
        errorMessage = '🚫 Google Drive 접근 권한이 없습니다.';
        suggestion = '관리자에게 문의하거나 Google Drive 권한을 확인해주세요.';
    } else if (error.message.includes('quota') || error.message.includes('용량')) {
        errorMessage = '📊 Google Drive 저장 공간이 부족합니다.';
        suggestion = 'Google Drive 공간을 확보하거나 다른 계정을 사용해주세요.';
    } else if (error.message.includes('network') || error.message.includes('네트워크')) {
        errorMessage = '🌐 네트워크 연결 오류가 발생했습니다.';
        suggestion = '인터넷 연결을 확인하고 다시 시도해주세요.';
    } else if (error.message.includes('size') || error.message.includes('크기')) {
        errorMessage = '📁 파일 크기가 너무 큽니다.';
        suggestion = '녹화 시간을 줄이거나 화질 설정을 낮춰보세요.';
    } else if (error.message.includes('timeout')) {
        errorMessage = '⏱️ 업로드 시간이 초과되었습니다.';
        suggestion = '네트워크 상태를 확인하고 다시 시도해주세요.';
    }
    
    const fullMessage = suggestion 
        ? `${errorMessage}<br><small style="opacity: 0.8;">💡 ${suggestion}</small>`
        : errorMessage;
    
    showError(fullMessage + '<br><small>📥 파일은 로컬에 다운로드되었습니다.</small>');
    
    // 3초 후 수동 업로드 옵션 안내
    setTimeout(() => {
        showInfo('💡 "수동 업로드" 버튼으로 다시 시도할 수 있습니다.', 5000);
    }, 3000);
    
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

// Phase 5: 드래그앤드롭 초기화
function initializeDragDrop() {
    const dragDropZone = document.getElementById('dragDropZone');
    const fileInput = document.getElementById('fileInput');
    const fileSelectBtn = document.getElementById('fileSelectBtn');
    const uploadProgressSection = document.getElementById('uploadProgressSection');
    const fileUploadList = document.getElementById('fileUploadList');

    if (!dragDropZone || !fileInput || !fileSelectBtn) {
        console.warn('드래그앤드롭 요소를 찾을 수 없습니다.');
        return;
    }

    // 파일 선택 버튼 클릭
    fileSelectBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // 파일 입력 변경
    fileInput.addEventListener('change', (e) => {
        handleFiles(Array.from(e.target.files));
    });

    // 드래그앤드롭 이벤트
    dragDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDropZone.classList.add('drag-active');
    });

    dragDropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 드래그 영역을 완전히 벗어났을 때만 클래스 제거
        if (!dragDropZone.contains(e.relatedTarget)) {
            dragDropZone.classList.remove('drag-active');
        }
    });

    dragDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDropZone.classList.remove('drag-active');
        
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });

    console.log('🎯 드래그앤드롭 초기화 완료');
}

// Phase 5: 파일 처리 함수
function handleFiles(files) {
    console.log('📁 선택된 파일들:', files);
    
    // 비디오 파일만 필터링
    const videoFiles = files.filter(file => {
        return file.type.startsWith('video/') || 
               ['mp4', 'webm', 'avi', 'mov', 'mkv'].some(ext => 
                   file.name.toLowerCase().endsWith(`.${ext}`)
               );
    });

    if (videoFiles.length === 0) {
        showError('비디오 파일만 업로드할 수 있습니다.');
        return;
    }

    // 파일 크기 제한 체크 (4GB)
    const maxSize = 4 * 1024 * 1024 * 1024; // 4GB
    const oversizedFiles = videoFiles.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
        showError(`파일 크기가 너무 큽니다. 최대 4GB까지 지원됩니다.\n문제 파일: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
    }

    showInfo(`${videoFiles.length}개의 비디오 파일이 선택되었습니다.`);
    
    // 업로드 진행 상황 섹션 표시
    const uploadProgressSection = document.getElementById('uploadProgressSection');
    uploadProgressSection.style.display = 'block';
    
    // 각 파일에 대해 업로드 시작
    videoFiles.forEach(file => {
        uploadFileWithSignedUrl(file);
    });
}

// Phase 5: Signed URL을 사용한 파일 업로드
async function uploadFileWithSignedUrl(file) {
    const fileId = generateFileId();
    
    try {
        // 업로드 항목 UI 생성
        createFileUploadItem(fileId, file);
        updateFileUploadStatus(fileId, 'uploading', '업로드 URL 요청 중...');
        
        console.log(`🚀 ${file.name} 업로드 시작`);
        
        // 1단계: 백엔드에서 Signed URL 요청
        const urlResponse = await fetch('/api/generate-upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                filename: file.name, 
                contentType: file.type,
                size: file.size
            }),
        });

        if (!urlResponse.ok) {
            throw new Error(`URL 생성 실패: ${urlResponse.status}`);
        }

        const { uploadUrl, newFilename } = await urlResponse.json();
        updateFileUploadStatus(fileId, 'uploading', '파일 업로드 중...');

        // 2단계: Signed URL을 사용해 직접 업로드
        const uploadResponse = await uploadFileWithProgress(uploadUrl, file, (progress) => {
            updateFileUploadProgress(fileId, progress);
        });

        if (!uploadResponse.ok) {
            throw new Error(`업로드 실패: ${uploadResponse.status}`);
        }

        updateFileUploadStatus(fileId, 'completed', 'Google Drive로 이동 중...');
        showSuccess(`${file.name} 업로드 완료!`);
        
        console.log(`✅ ${file.name} 업로드 성공`);

    } catch (error) {
        console.error(`❌ ${file.name} 업로드 오류:`, error);
        updateFileUploadStatus(fileId, 'error', error.message);
        showError(`${file.name} 업로드 실패: ${error.message}`);
    }
}

// 진행률과 함께 파일 업로드
function uploadFileWithProgress(url, file, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentage = Math.round((e.loaded / e.total) * 100);
                onProgress(percentage);
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr);
            } else {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
        });
        
        xhr.addEventListener('error', () => {
            reject(new Error('네트워크 오류가 발생했습니다.'));
        });
        
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
    });
}

// 파일 업로드 항목 UI 생성
function createFileUploadItem(fileId, file) {
    const fileUploadList = document.getElementById('fileUploadList');
    
    const fileItem = document.createElement('div');
    fileItem.className = 'file-upload-item';
    fileItem.id = `file-${fileId}`;
    
    fileItem.innerHTML = `
        <div class="file-info">
            <div class="file-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                </svg>
            </div>
            <div class="file-details">
                <h5>${file.name}</h5>
                <p>${formatFileSize(file.size)}</p>
            </div>
        </div>
        <div class="upload-status">
            <span class="status-badge uploading" id="status-${fileId}">준비 중</span>
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" id="progress-${fileId}"></div>
            </div>
        </div>
    `;
    
    fileUploadList.appendChild(fileItem);
}

// 파일 업로드 상태 업데이트
function updateFileUploadStatus(fileId, status, message) {
    const statusElement = document.getElementById(`status-${fileId}`);
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-badge ${status}`;
    }
}

// 파일 업로드 진행률 업데이트
function updateFileUploadProgress(fileId, percentage) {
    const progressElement = document.getElementById(`progress-${fileId}`);
    if (progressElement) {
        progressElement.style.width = `${percentage}%`;
    }
    
    const statusElement = document.getElementById(`status-${fileId}`);
    if (statusElement && statusElement.classList.contains('uploading')) {
        statusElement.textContent = `${percentage}%`;
    }
}

// 고유한 파일 ID 생성
function generateFileId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 기존 initializeApp에 드래그앤드롭 초기화 추가
const originalInitializeApp = initializeApp;
async function initializeApp() {
    await originalInitializeApp();
    initializeDragDrop();
}

console.log('Script loaded successfully'); 
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

        // Initial UI state
        updateUI('ready');
        
        console.log('앱 초기화 완료');
    } catch (error) {
        console.error('앱 초기화 오류:', error);
        showError('앱을 초기화하는 중 오류가 발생했습니다: ' + error.message);
    }
}

// Start recording function (placeholder for Phase 2)
async function startRecording() {
    try {
        updateUI('preparing');
        
        // TODO: Phase 2에서 실제 녹화 로직 구현
        console.log('녹화 시작 준비 중...');
        
        // Simulate preparation time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Start timer
        recordingStartTime = Date.now();
        startTimer();
        
        // Update UI
        updateUI('recording');
        isRecording = true;
        
        console.log('녹화 시작됨 (시뮬레이션)');
        
    } catch (error) {
        console.error('녹화 시작 오류:', error);
        showError('녹화를 시작하는 중 오류가 발생했습니다: ' + error.message);
        updateUI('ready');
    }
}

// Stop recording function (placeholder for Phase 2)
async function stopRecording() {
    try {
        updateUI('stopping');
        
        // TODO: Phase 2에서 실제 녹화 중지 로직 구현
        console.log('녹화 중지 중...');
        
        // Stop timer
        stopTimer();
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update UI
        updateUI('ready');
        isRecording = false;
        
        console.log('녹화 중지됨 (시뮬레이션)');
        
        // TODO: Phase 3에서 Google Drive 업로드 로직 구현
        
    } catch (error) {
        console.error('녹화 중지 오류:', error);
        showError('녹화를 중지하는 중 오류가 발생했습니다: ' + error.message);
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

// Show error message
function showError(message) {
    alert(message); // TODO: 더 나은 에러 표시 방법으로 개선
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

console.log('Script loaded successfully'); 
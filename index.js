const express = require('express');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// Google Cloud Storage 설정
const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE, // 서비스 계정 키 파일 경로
});

const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
const bucket = storage.bucket(bucketName);

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'video-upload-api'
    });
});

// Signed URL 생성 엔드포인트
app.post('/api/generate-upload-url', async (req, res) => {
    try {
        const { filename, contentType, size } = req.body;

        if (!filename || !contentType) {
            return res.status(400).json({ 
                error: 'filename과 contentType이 필요합니다.' 
            });
        }

        // 파일 크기 체크 (4GB 제한)
        const maxSize = 4 * 1024 * 1024 * 1024; // 4GB
        if (size && size > maxSize) {
            return res.status(400).json({ 
                error: '파일 크기가 4GB를 초과할 수 없습니다.' 
            });
        }

        // 비디오 파일 타입 체크
        if (!contentType.startsWith('video/')) {
            return res.status(400).json({ 
                error: '비디오 파일만 업로드할 수 있습니다.' 
            });
        }

        // 날짜별 폴더 구조 생성: YYYY-MM-DD
        const today = new Date();
        const dateFolder = today.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // 고유한 파일명 생성 (타임스탬프 + 원본 파일명)
        const timestamp = Date.now();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const newFilename = `temp/${dateFolder}/${timestamp}_${sanitizedFilename}`;

        console.log(`📁 Signed URL 생성: ${newFilename}`);

        // Signed URL 옵션 설정
        const options = {
            version: 'v4',
            action: 'write',
            expires: Date.now() + 60 * 60 * 1000, // 1시간 후 만료
            contentType: contentType,
        };

        // Signed URL 생성
        const [signedUrl] = await bucket.file(newFilename).getSignedUrl(options);

        console.log(`✅ Signed URL 생성 완료: ${filename}`);

        res.json({
            uploadUrl: signedUrl,
            newFilename: newFilename,
            bucketName: bucketName,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        });

    } catch (error) {
        console.error('❌ Signed URL 생성 오류:', error);
        res.status(500).json({ 
            error: 'Signed URL 생성에 실패했습니다.',
            details: error.message 
        });
    }
});

// 업로드 완료 알림 엔드포인트 (옵션)
app.post('/api/upload-complete', async (req, res) => {
    try {
        const { filename, bucketPath } = req.body;
        
        console.log(`📤 업로드 완료 알림: ${filename} -> ${bucketPath}`);
        
        // 여기서 Google Drive로 파일 이동 로직을 추가할 수 있습니다
        // 현재는 Cloud Functions으로 처리할 예정이므로 로그만 남깁니다
        
        res.json({ 
            message: '업로드 완료 알림을 받았습니다.',
            filename: filename,
            bucketPath: bucketPath
        });

    } catch (error) {
        console.error('❌ 업로드 완료 처리 오류:', error);
        res.status(500).json({ 
            error: '업로드 완료 처리에 실패했습니다.',
            details: error.message 
        });
    }
});

// 오류 처리 미들웨어
app.use((error, req, res, next) => {
    console.error('서버 오류:', error);
    res.status(500).json({ 
        error: '서버 내부 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// 404 처리
app.use((req, res) => {
    res.status(404).json({ error: '요청한 엔드포인트를 찾을 수 없습니다.' });
});

// 서버 시작
app.listen(port, () => {
    console.log(`🚀 Video Upload API 서버가 포트 ${port}에서 실행 중입니다.`);
    console.log(`📊 Health Check: http://localhost:${port}/health`);
    console.log(`🔗 Upload URL API: http://localhost:${port}/api/generate-upload-url`);
    
    // 환경 변수 체크
    const requiredEnvVars = [
        'GOOGLE_CLOUD_PROJECT_ID',
        'GOOGLE_CLOUD_KEY_FILE', 
        'GOOGLE_CLOUD_STORAGE_BUCKET'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.warn(`⚠️  다음 환경 변수가 설정되지 않았습니다: ${missingVars.join(', ')}`);
        console.warn('   .env 파일을 확인해주세요.');
    } else {
        console.log('✅ 모든 환경 변수가 설정되었습니다.');
    }
}); 
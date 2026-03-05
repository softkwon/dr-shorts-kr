/* 날짜: 2026-03-05
코드이름: api.js
수정할 부분 내용: 통신 헤더/URL 에러(ISO-8859-1) 방지를 위한 한글 문자열 완벽 제거
*/

// ==========================================
// 1. 텍스트 생성 (Gemini API) 세팅
// ==========================================
const GEMINI_API_KEY = "AIzaSyBM3tt9fWaXODQGnhrA1FGNTCbGHgkNTjs"; 
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`;

export async function generateAiPrompt(keywords, type) {
    const promptText = `의료법을 준수하여 [${keywords}] 기반 ${type} 대본을 작성하세요.`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        if (!response.ok) {
            const errorInfo = await response.json();
            console.error("구글 서버 상세 에러:", errorInfo); 
            throw new Error(`API 호출 실패: ${errorInfo.error.message}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            return {
                fullText: data.candidates[0].content.parts[0].text,
                status: "success"
            };
        } else {
            throw new Error("API 응답 데이터 형식이 올바르지 않습니다.");
        }
    } catch (error) {
        console.error("Gemini API 호출 에러:", error);
        return { status: "error", message: error.message };
    }
}

// ==========================================
// 2. 비디오 생성 (Vertex AI - Veo) 세팅
// ==========================================
// 🚨 주의: 아래 두 변수에는 "반드시" 복사한 영어/숫자만 넣으세요. 한글이 들어가면 즉시 에러가 납니다.

// 1. gcloud auth print-access-token 으로 발급받은 실제 토큰을 넣으세요 (ya29... 로 시작)
const VERTEX_ACCESS_TOKEN = "";

// 2. 구글 클라우드 콘솔에 적힌 영문/숫자 프로젝트 ID를 넣으세요 (예: dr-shorts-video-123)
const PROJECT_ID = "dr-shorts-video-mvp"; 

const LOCATION = "us-central1"; 

const VEO_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/veo-3.1-generate-001:predictLongRunning`;

export async function createAiVideo(script) {
    console.log("🎥 1. 우리 백엔드(Vercel)에 Veo 비디오 생성을 요청합니다...");

    try {
        // 1. Vercel 백엔드로 POST 요청 보내기
        const response = await fetch('/api/veo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "백엔드 통신 실패");
        }

        const data = await response.json();
        const operationName = data.operationName; 
        console.log(`⏳ 2. 요청 성공! 작업 번호: ${operationName}. 폴링을 시작합니다...`);

        // 2. 작업 번호로 폴링 시작
        return await pollRealVideoStatus(operationName);

    } catch (error) {
        console.error("비디오 생성 시작 실패:", error);
        throw error;
    }
}

async function pollRealVideoStatus(operationName) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 60; 

        const interval = setInterval(async () => {
            attempts++;
            console.log(`백엔드에 영상 완성 여부 확인 중... (${attempts}회차)`);

            try {
                // 💡 GET 요청으로 Vercel 백엔드에 찔러보기
                const res = await fetch(`/api/veo?operationName=${encodeURIComponent(operationName)}`);
                const statusData = await res.json();

                if (statusData.done) {
                    clearInterval(interval);
                    
                    if (statusData.error) {
                        reject(new Error(`렌더링 실패: ${statusData.error.message}`));
                    } else {
                        console.log("✅ 3. 영상 렌더링 완료! 실제 비디오를 가져옵니다.");
                        const realVideoUrl = statusData.response?.videoUri || statusData.response?.videoUrl; 
                        
                        resolve({
                            videoUrl: realVideoUrl, 
                            thumbnail: "https://via.placeholder.com/400x225/f97316/ffffff?text=AI+Shorts+Ready"
                        });
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    reject(new Error("영상 렌더링 타임아웃 발생"));
                }
            } catch (err) {
                console.warn("상태 조회 중 오류 (재시도 진행):", err);
            }
        }, 5000); 
    });
}
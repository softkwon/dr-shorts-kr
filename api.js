/* 날짜: 2026-03-06
코드이름: api.js (최종 통합 버전)
수정할 부분 내용: 프론트엔드에서 API 키 및 구글 직접 호출 완전 제거. 모든 요청을 Vercel 백엔드로 라우팅.
*/

// ==========================================
// 1. 텍스트 생성 (Gemini) - Vercel 백엔드(/api/gemini) 연결
// ==========================================
export async function generateAiPrompt(keywords, type) {
    console.log("📝 1. 우리 백엔드(Vercel)에 대본 생성을 요청합니다...");

    try {
        // 옛날 GEMINI_URL 대신 우리의 안전한 백엔드 주소로 요청합니다.
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords, type })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "백엔드 통신 실패");
        }

        const data = await response.json();
        return data; 

    } catch (error) {
        console.error("대본 생성 실패:", error);
        return { status: "error", message: error.message };
    }
}

// ==========================================
// 2. 비디오 생성 (Veo) - Vercel 백엔드(/api/veo) 연결
// ==========================================
export async function createAiVideo(script) {
    console.log("🎥 1. 우리 백엔드(Vercel)에 Veo 비디오 생성을 요청합니다...");

    try {
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
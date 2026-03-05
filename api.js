/* 날짜: 2026-03-06
코드이름: api.js (데이터 추출 및 체킹 강화 버전)
수정할 부분 내용: 구글 응답 객체(GenerateVideoResponse)의 대소문자 구분 및 중첩 구조 파싱 로직 최종 보강
*/

export async function generateAiPrompt(keywords, type) {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords, type })
        });
        return await response.json(); 
    } catch (error) {
        console.error("대본 생성 실패:", error);
        return { status: "error", message: error.message };
    }
}

export async function createAiVideo(script) {
    try {
        const response = await fetch('/api/veo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script })
        });
        const data = await response.json();
        return await pollRealVideoStatus(data.operationName);
    } catch (error) {
        console.error("비디오 생성 시작 실패:", error);
        throw error;
    }
}

async function pollRealVideoStatus(operationName) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            try {
                // 💡 [체킹] 백엔드에 현재 상태를 물어봅니다.
                const res = await fetch(`/api/veo?operationName=${encodeURIComponent(operationName)}`);
                const statusData = await res.json();

                if (statusData.done) {
                    clearInterval(interval);
                    
                    if (statusData.error) {
                        reject(new Error(`렌더링 실패: ${statusData.error.message}`));
                    } else {
                        console.log("✅ [성공] 구글 서버가 작업을 마쳤습니다. 데이터를 분석합니다.");
                        
                        // 💡 [핵심 보강] 구글의 복잡하고 유동적인 응답 구조를 샅샅이 뒤집니다.
                        const resp = statusData.response;
                        // g가 대문자인 경우와 소문자인 경우 모두 대응
                        const genRes = resp?.GenerateVideoResponse || resp?.generateVideoResponse;
                        
                        // 영상 객체 후보군 (GeneratedSamples 또는 videos)
                        const samples = genRes?.generatedSamples || genRes?.videos || resp?.videos;
                        const videoObj = (samples && samples[0]?.video) ? samples[0].video : (samples ? samples[0] : null);
                        
                        let realVideoUrl = null;

                        if (videoObj?.bytesBase64Encoded) {
                            console.log("📦 Base64 형태의 영상을 발견했습니다.");
                            realVideoUrl = `data:video/mp4;base64,${videoObj.bytesBase64Encoded}`;
                        } else if (videoObj?.uri) {
                            console.log("🔗 URL 형태의 영상을 발견했습니다:", videoObj.uri);
                            realVideoUrl = videoObj.uri.replace("gs://", "https://storage.googleapis.com/");
                        }

                        if (realVideoUrl) {
                            console.log("🚀 영상 주소 추출 완료! 화면에 표시합니다.");
                            resolve({ videoUrl: realVideoUrl });
                        } else {
                            console.error("❌ [오류] 데이터 구조 분석 실패:", resp);
                            reject(new Error("영상 데이터 위치를 찾을 수 없습니다."));
                        }
                    }
                } else {
                    // 💡 [체킹] 진행 상황 로그 출력
                    console.log(`⏳ 영상 제작 중... (${attempts}회차 확인 완료)`);
                }
            } catch (err) {
                console.warn("조회 대기 중...", err);
            }
        }, 5000);
    });
}

export async function downloadVideo(videoUrl, filename = "dr_shorts_veo.mp4") {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
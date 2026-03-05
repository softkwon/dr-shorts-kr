/* 날짜: 2026-03-06
코드이름: api.js (파싱 로직 최종 강화)
수정할 부분 내용: 구글 Veo 응답 구조(generatedSamples, videos 복수형 대응) 파싱 로직 세분화
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
                const res = await fetch(`/api/veo?operationName=${encodeURIComponent(operationName)}`);
                const statusData = await res.json();

                if (statusData.done) {
                    clearInterval(interval);
                    if (statusData.error) {
                        reject(new Error(`렌더링 실패: ${statusData.error.message}`));
                    } else {
                        // 💡 [핵심 수정] 구글 응답의 모든 가능성을 체크합니다.
                        const responseObj = statusData.response;
                        const genRes = responseObj?.generateVideoResponse;
                        
                        // 1순위: generatedSamples[0].video (최신 규격)
                        // 2순위: videos[0] (복수형 응답 대응)
                        const videoObj = genRes?.generatedSamples?.[0]?.video || genRes?.videos?.[0] || responseObj?.video;
                        
                        let realVideoUrl = null;
                        if (videoObj?.bytesBase64Encoded) {
                            realVideoUrl = `data:video/mp4;base64,${videoObj.bytesBase64Encoded}`;
                        } else if (videoObj?.uri) {
                            realVideoUrl = videoObj.uri.startsWith('gs://') 
                                ? videoObj.uri.replace("gs://", "https://storage.googleapis.com/") 
                                : videoObj.uri;
                        }

                        if (!realVideoUrl) {
                            console.log("파싱 시도 데이터:", responseObj); // 디버깅용
                            reject(new Error("영상은 완성되었으나 데이터를 추출할 수 없습니다."));
                        } else {
                            resolve({ videoUrl: realVideoUrl });
                        }
                    }
                }
            } catch (err) { console.warn("조회 중...", err); }
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
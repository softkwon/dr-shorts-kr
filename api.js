/* 날짜: 2026-03-06
코드이름: api.js
수정할 부분 내용: Vertex AI 응답 구조 파싱 완벽 수정(Base64/URI 모두 대응) 및 영상 다운로드(downloadVideo) 기능 추가
*/

// ==========================================
// 1. 텍스트 생성 (Gemini) 
// ==========================================
export async function generateAiPrompt(keywords, type) {
    console.log("📝 1. 우리 백엔드(Vercel)에 대본 생성을 요청합니다...");

    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords, type })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "백엔드 통신 실패");
        }

        return await response.json(); 

    } catch (error) {
        console.error("대본 생성 실패:", error);
        return { status: "error", message: error.message };
    }
}

// ==========================================
// 2. 비디오 생성 (Veo) 및 폴링
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
        console.log(`⏳ 2. 요청 성공! 작업 번호: ${data.operationName}. 폴링을 시작합니다...`);

        return await pollRealVideoStatus(data.operationName);

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
                        console.log("✅ 3. 영상 렌더링 완료! 실제 비디오를 추출합니다.");
                        console.log("구글 응답 원본:", statusData); // 디버깅용

                        // 💡 [핵심] 구글 Veo의 실제 응답 구조(깊은 곳)에서 비디오 데이터 꺼내기
                        const genResponse = statusData.response?.generateVideoResponse;
                        const videoData = genResponse?.generatedSamples?.[0]?.video || genResponse?.videos?.[0];
                        
                        let realVideoUrl = null;
                        
                        // 1. Base64로 직접 들어온 경우 (가장 확실함)
                        if (videoData?.bytesBase64Encoded) {
                            realVideoUrl = `data:video/mp4;base64,${videoData.bytesBase64Encoded}`;
                        } 
                        // 2. 일반 URL로 들어온 경우
                        else if (videoData?.uri) {
                            realVideoUrl = videoData.uri;
                        } 
                        // 3. 구글 스토리지(gs://)로 들어온 경우 -> 웹 접근 가능 URL로 변환
                        else if (videoData?.gcsUri) {
                            realVideoUrl = videoData.gcsUri.replace("gs://", "https://storage.googleapis.com/");
                        } 
                        // 4. 예비용 옛날 구조
                        else {
                            realVideoUrl = statusData.response?.videoUri || statusData.response?.videoUrl;
                        }

                        if (!realVideoUrl) {
                            console.error("비디오 URL 파싱 실패:", statusData.response);
                            reject(new Error("영상은 생성되었으나 주소를 해석할 수 없습니다."));
                            return;
                        }

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

// ==========================================
// 3. 비디오 강제 다운로드 기능 추가
// ==========================================
export async function downloadVideo(videoUrl, filename = "dr_shorts_veo.mp4") {
    try {
        console.log("다운로드 준비 중...");
        
        // Base64 데이터인 경우 바로 다운로드 가능
        if (videoUrl.startsWith('data:')) {
            const a = document.createElement("a");
            a.href = videoUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            return;
        }

        // 외부 URL인 경우, 새 탭 열기를 방지하고 강제로 파일로 다운로드 받기 위해 Blob 변환
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // 메모리 찌꺼기 정리
        setTimeout(() => {
            a.remove();
            URL.revokeObjectURL(blobUrl);
        }, 100);
        
    } catch (error) {
        console.error("비디오 다운로드 실패:", error);
        alert("보안 정책으로 인해 직접 다운로드가 제한되었습니다. 새 창에서 마우스 우클릭으로 저장해주세요.");
        window.open(videoUrl, '_blank'); // 실패 시 차선책으로 새 탭에서 열어줌
    }
}
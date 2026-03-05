/* 날짜: 2026-03-06
코드이름: api/veo.js
수정할 부분 내용: Vertex AI Veo 모델의 상태 확인용 특수 엔드포인트(:fetchPredictOperation) 적용 및 POST 방식으로 완벽 전환
*/
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
    try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        const auth = new GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const { token: accessToken } = await client.getAccessToken();

        const PROJECT_ID = credentials.project_id;
        const LOCATION = "us-central1";
        
        // 💡 Veo 모델의 기본 주소
        const MODEL_BASE_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/veo-3.1-generate-001`;

        // ==========================================
        // [1] POST 요청: 비디오 생성 시작
        // ==========================================
        if (req.method === 'POST') {
            const { script } = req.body;
            
            // 💡 시작할 때는 :predictLongRunning 을 호출합니다.
            const response = await fetch(`${MODEL_BASE_URL}:predictLongRunning`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instances: [{ prompt: script }],
                    parameters: { aspectRatio: "9:16", duration: "00:00:15" }
                })
            });

            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } 
            catch(e) { throw new Error(`POST 응답 에러: ${text.substring(0, 100)}`); }
            
            if (!response.ok) throw new Error(data.error?.message || "Veo API 시작 오류");
            
            // 구글이 준 긴 작업 번호를 그대로 프론트엔드로 전달
            return res.status(200).json({ operationName: data.name });
        }

        // ==========================================
        // [2] GET 요청: 비디오 생성 상태 확인 (폴링)
        // ==========================================
        if (req.method === 'GET') {
            let { operationName } = req.query;
            if(!operationName) throw new Error("operationName 파라미터가 없습니다.");
            
            operationName = decodeURIComponent(operationName); 

            // 💡 [핵심 해결책] 주소(URL)로 GET 요청을 하는 것이 아니라, 
            // 특수 엔드포인트(:fetchPredictOperation)에 POST 방식으로 영수증 번호를 제출해야 합니다!
            const response = await fetch(`${MODEL_BASE_URL}:fetchPredictOperation`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    operationName: operationName // 영수증 번호를 바디에 담아서 제출
                })
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (error) {
                console.error("🚨 구글 서버가 JSON이 아닌 데이터를 반환했습니다. 내용:", text.substring(0, 200));
                throw new Error("구글 서버 응답 오류. (HTML 반환됨)");
            }

            if (!response.ok) throw new Error(data.error?.message || "Veo API 상태 확인 오류");
            
            // 성공적으로 받은 상태(진행중 or 완료)를 프론트엔드에 전달
            return res.status(200).json(data);
        }

        return res.status(405).json({ error: "허용되지 않은 메서드입니다." });

    } catch (error) {
        console.error("Vercel 백엔드 에러 상세:", error);
        return res.status(500).json({ error: error.message });
    }
}
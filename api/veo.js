/* 날짜: 2026-03-06
코드이름: api/veo.js
수정할 부분 내용: 구글이 반환한 비정상적인 긴 작업경로(Publisher Model)에서 ID만 추출하여, 표준 Operations API 주소로 상태 조회를 하도록 완벽 우회 처리
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

        // ==========================================
        // [1] POST 요청: 비디오 생성 시작
        // ==========================================
        if (req.method === 'POST') {
            const { script } = req.body;
            const VEO_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/veo-3.1-generate-001:predictLongRunning`;

            const response = await fetch(VEO_URL, {
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
        // [2] GET 요청: 비디오 생성 상태 확인
        // ==========================================
        if (req.method === 'GET') {
            let { operationName } = req.query;
            if(!operationName) throw new Error("operationName 파라미터가 없습니다.");
            
            operationName = decodeURIComponent(operationName); 

            // 💡 [핵심 해결책] 구글이 준 긴 경로에서 맨 뒤의 '고유 ID'만 추출합니다.
            const operationId = operationName.split('/').pop(); 
            
            // 💡 추출한 고유 ID를 이용해 구글이 100% 알아듣는 '표준 상태 조회 주소'로 재조립합니다.
            const OPERATION_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/operations/${operationId}`;

            const response = await fetch(OPERATION_URL, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                },
                cache: 'no-store'
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (error) {
                console.error("🚨 구글 서버가 JSON이 아닌 데이터를 반환했습니다. URL:", OPERATION_URL, "내용:", text.substring(0, 200));
                throw new Error("구글 서버 응답 오류. (HTML 반환됨)");
            }

            if (!response.ok) throw new Error(data.error?.message || "Veo API 상태 확인 오류");
            
            // 💡 성공적으로 받은 상태(진행중 or 완료)를 프론트엔드에 전달
            return res.status(200).json(data);
        }

        return res.status(405).json({ error: "허용되지 않은 메서드입니다." });

    } catch (error) {
        console.error("Vercel 백엔드 에러 상세:", error);
        return res.status(500).json({ error: error.message });
    }
}
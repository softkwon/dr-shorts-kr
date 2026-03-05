/* 날짜: 2026-03-06
코드이름: api/veo.js
수정할 부분 내용: Vercel 서버리스 백엔드 로직 작성 (구글 서비스 계정 인증 및 Veo API 호출 처리)
*/

import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
    try {
        // 💡 Vercel 환경 변수에 등록할 구글 JSON 마스터키를 읽어옵니다.
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        
        // 💡 마스터키를 이용해 1시간짜리 임시 토큰을 "서버가 알아서" 자동 발급받습니다.
        const auth = new GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const { token: accessToken } = await client.getAccessToken();

        const PROJECT_ID = credentials.project_id;
        const LOCATION = "us-central1";

        // ==========================================
        // [1] POST 요청: 프론트엔드가 "영상 만들어줘!" 할 때
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

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || "Veo API 시작 오류");
            
            // 작업 번호(Operation ID)만 프론트엔드로 바로 돌려보냅니다.
            return res.status(200).json({ operationName: data.name });
        }

        // ==========================================
        // [2] GET 요청: 프론트엔드가 5초마다 "영상 다 됐어?" 물어볼 때
        // ==========================================
        if (req.method === 'GET') {
            const { operationName } = req.query;
            const OPERATION_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/${operationName}`;

            const response = await fetch(OPERATION_URL, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || "Veo API 상태 확인 오류");
            
            // 구글이 준 현재 상태를 그대로 프론트엔드에 전달합니다.
            return res.status(200).json(data);
        }

        return res.status(405).json({ error: "허용되지 않은 메서드입니다." });

    } catch (error) {
        console.error("Vercel 백엔드 에러:", error);
        return res.status(500).json({ error: error.message });
    }
}
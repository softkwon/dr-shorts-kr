/* 날짜: 2026-03-06
코드이름: api/veo.js (강화된 버전)
수정할 부분 내용: 구글 서버의 비정상(HTML) 응답에 대한 예외 처리 강화 및 파라미터 디코딩 추가
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

            // 💡 1차 방어: JSON 파싱 전 텍스트로 먼저 받기
            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } 
            catch(e) { throw new Error(`POST 응답 에러 (JSON 아님): ${text.substring(0, 100)}`); }
            
            if (!response.ok) throw new Error(data.error?.message || "Veo API 시작 오류");
            return res.status(200).json({ operationName: data.name });
        }

        // ==========================================
        // [2] GET 요청: 비디오 생성 상태 확인
        // ==========================================
        if (req.method === 'GET') {
            let { operationName } = req.query;
            if(!operationName) throw new Error("operationName 파라미터가 없습니다.");
            
            // 💡 2차 방어: URL 인코딩 문자열을 완벽하게 해독
            operationName = decodeURIComponent(operationName); 

            const OPERATION_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/${operationName}`;

            const response = await fetch(OPERATION_URL, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                cache: 'no-store' // 💡 3차 방어: 이전 확인 결과를 재사용(캐시)하지 않도록 강제
            });

            // 💡 핵심 방어: 무작정 json()으로 읽지 않고 에러 발생 시 HTML 내용을 출력하도록 처리
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (error) {
                console.error("🚨 구글 서버가 JSON이 아닌 데이터를 반환했습니다:", text.substring(0, 200));
                throw new Error(`구글 서버 응답 오류. URL: ${OPERATION_URL}`);
            }

            if (!response.ok) throw new Error(data.error?.message || "Veo API 상태 확인 오류");
            return res.status(200).json(data);
        }

        return res.status(405).json({ error: "허용되지 않은 메서드입니다." });

    } catch (error) {
        console.error("Vercel 백엔드 에러:", error);
        return res.status(500).json({ error: error.message });
    }
}
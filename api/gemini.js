/* 날짜: 2026-03-06
코드이름: api/gemini.js
수정할 부분 내용: Gemini 텍스트 생성을 Vercel 서버리스 환경에서 안전하게 처리 (API 키 은닉)
*/

export default async function handler(req, res) {
    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "허용되지 않은 메서드입니다." });
    }

    try {
        const { keywords, type } = req.body;
        
        // 💡 Vercel 환경 변수에 숨겨둔 새 키를 안전하게 불러옵니다.
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`;
        
        const promptText = `의료법을 준수하여 [${keywords}] 기반 ${type} 대본을 작성하세요.`;

        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || "Gemini API 서버 오류");
        }

        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            return res.status(200).json({
                fullText: data.candidates[0].content.parts[0].text,
                status: "success"
            });
        } else {
            throw new Error("API 응답 데이터 형식이 올바르지 않습니다.");
        }
    } catch (error) {
        console.error("Gemini 백엔드 에러:", error);
        return res.status(500).json({ error: error.message });
    }
}
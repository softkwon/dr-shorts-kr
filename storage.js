/* 날짜: 2026-03-05 
코드이름: storage.js 
내용: 콘텐츠 생성 단계별 데이터 저장 및 대시보드 렌더링 통합 로직 
*/

/**
 * 1. 생성 중인 콘텐츠 임시 저장 (create -> scan -> editor 단계용)
 */
export function saveTempContent(type, keywords) {
    const tempContent = {
        id: Date.now(),
        type: type, // 'video' 또는 'sns'
        keywords: keywords,
        date: new Date().toLocaleDateString(),
        status: 'scanning' // 검수 중 상태
    };
    localStorage.setItem('tempContent', JSON.stringify(tempContent));
    return tempContent;
}

/**
 * 2. 최종 생성 완료된 콘텐츠 저장 (editor에서 최종 확인 후 보관함 이동)
 */
export function finalizeContent() {
    const temp = JSON.parse(localStorage.getItem('tempContent'));
    if (!temp) return;

    let myContents = JSON.parse(localStorage.getItem('myContents') || '[]');
    
    // 최종 데이터 구성 (영상 URL, 대본 등 포함)
    const newContent = {
        ...temp,
        id: Date.now(), // 고유 ID 재할당
        status: 'completed',
        views: 0,
        clicks: 0,
        publishedPlatforms: []
    };

    myContents.push(newContent);
    localStorage.setItem('myContents', JSON.stringify(myContents));
    localStorage.setItem('currentContentId', newContent.id);
    localStorage.removeItem('tempContent'); // 임시 저장소 비우기
}

/**
 * 3. 대시보드 갤러리 렌더링 함수
 */
export function renderDashboardGallery() {
    const gallery = document.getElementById('dashboard-gallery');
    if (!gallery) return;

    const myContents = JSON.parse(localStorage.getItem('myContents') || '[]');

    if (myContents.length === 0) {
        gallery.innerHTML = `
            <div onclick="location.href='create.html'" class="col-span-full border-2 border-dashed border-gray-200 rounded-2xl py-12 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                <span class="text-4xl mb-3">➕</span>
                <p class="text-gray-500 font-medium">첫 번째 콘텐츠를 만들어보세요!</p>
            </div>`;
    } else {
        // 최신순으로 정렬하여 상위 3개만 추출
        const latest = myContents.slice().reverse().slice(0, 3);
        
        gallery.innerHTML = latest.map(item => `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
                <div class="aspect-video bg-gray-200 relative">
                    <img src="https://via.placeholder.com/400x225/f97316/ffffff?text=AI+Generated" class="w-full h-full object-cover">
                </div>
                <div class="p-4 text-left">
                    <p class="text-[10px] text-orange-500 font-bold mb-1">${item.date}</p>
                    <h4 class="font-bold text-sm text-gray-800 mb-2 truncate">${item.keywords || '진료 안내'}</h4>
                    <div class="flex justify-between items-center text-[10px] text-gray-400 border-t pt-2">
                        <span>📊 조회수 ${item.views || 0}</span>
                        <button onclick="location.href='editor.html?id=${item.id}'" class="text-blue-500 font-bold hover:underline transition">상세보기</button>
                    </div>
                </div>
            </div>`).join('');
    }
}

/**
 * 4. 상단 성과 지표 업데이트
 */
export function updateDashboardStats() {
    const myContents = JSON.parse(localStorage.getItem('myContents') || '[]');
    
    // 대시보드 상단 요소가 있을 경우 수치 반영
    const totalCountEl = document.getElementById('total-content-count');
    if (totalCountEl) {
        totalCountEl.innerText = myContents.length.toLocaleString();
    }
    
    console.log("현재 총 보유 콘텐츠 수:", myContents.length);
}

/**
 * 5. 특정 ID로 콘텐츠 찾기 (상세보기용)
 */
export function getContentById(id) {
    const contents = JSON.parse(localStorage.getItem('myContents') || '[]');
    return contents.find(c => c.id == id);
}
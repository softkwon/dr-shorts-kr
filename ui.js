/* ui.js - 최종 클린 버전 */
export function loadComponent(elementId, url, callback) {
    const element = document.getElementById(elementId);
    if (!element) return;

    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error(`파일 로드 실패: ${url}`);
            return res.text();
        })
        .then(data => {
            element.innerHTML = data;
            if (callback) callback();
        })
        .catch(err => console.error("컴포넌트 로드 에러:", err));
}

// 💡 전역 함수는 window 객체에 직접 할당하여 중복 선언 에러를 방지합니다.
window.toggleUserMenu = function() {
    const menu = document.getElementById('user-dropdown');
    if (menu) menu.classList.toggle('hidden');
};
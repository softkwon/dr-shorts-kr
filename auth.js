/* 날짜: 2026-03-05 
코드이름: auth.js
내용: 비동기 로딩 대응 및 전역 함수 연동 강화
*/

// 로그인 상태 확인 및 UI 업데이트
export function checkLoginState() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userName = localStorage.getItem('managerName') || '원장';

    if (isLoggedIn) {
        // 💡 0.1초 정도 아주 미세한 지연을 주어 헤더 로딩이 완료될 시간을 벌어줍니다.
        setTimeout(() => {
            const authArea = document.getElementById('auth-area');
            const guestArea = document.getElementById('guest-area');
            const nameDisplay = document.querySelector('.user-name-text');

            if (authArea) authArea.classList.remove('hidden');
            if (guestArea) guestArea.classList.add('hidden');
            if (nameDisplay) nameDisplay.innerText = userName;
        }, 100); 
    }
}

// 로그아웃 처리 (전역 노출)
window.handleLogout = function() {
    localStorage.removeItem('isLoggedIn');
    location.href = 'index.html';
};

// 로그인 성공 시 공통 처리
export function processLoginSuccess() {
    localStorage.setItem('isLoggedIn', 'true');
    location.href = 'dashboard.html';
}

window.handleAuthClick = function() {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        window.handleLogout();
    } else {
        location.href = 'login.html';
    }
};
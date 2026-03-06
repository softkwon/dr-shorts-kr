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

/* 날짜: 2026-03-06*/

let logoutInterval;

export function startLogoutTimer() {
    let timeRemaining = 90 * 60; // 90분 (5400초)

    if (logoutInterval) clearInterval(logoutInterval);

    logoutInterval = setInterval(() => {
        timeRemaining--;
        
        // 매 초마다 요소를 찾아서 업데이트 (헤더가 늦게 로딩되는 것을 대비)
        const timerDisplay = document.getElementById('logout-timer');
        if (timerDisplay) {
            const minutes = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
            const seconds = String(timeRemaining % 60).padStart(2, '0');
            timerDisplay.textContent = `${minutes}:${seconds}`;
        }

        if (timeRemaining <= 0) {
            clearInterval(logoutInterval);
            alert("보안을 위해 90분이 경과하여 자동 로그아웃 되었습니다.");
            localStorage.removeItem('currentUser'); // 로그인 정보 삭제
            window.location.href = 'login.html'; // 로그인 화면으로 튕겨냄
        }
    }, 1000);
}
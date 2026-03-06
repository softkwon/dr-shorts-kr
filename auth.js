// 로그인 상태 확인 및 UI 업데이트
export function checkLoginState() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userName = localStorage.getItem('managerName') || '영석'; 
    const userTier = localStorage.getItem('userTier') || 'Pro'; 

    setTimeout(() => {
        const authArea = document.getElementById('auth-area');
        const guestArea = document.getElementById('guest-area');

        if (isLoggedIn) {
            // 💡 로그인 상태: 드롭다운 보이기, 로그인 글자 숨기기
            if (authArea) authArea.classList.remove('hidden');
            if (guestArea) guestArea.classList.add('hidden');

            const nameDisplayNew = document.getElementById('userNameDisplay');
            if (nameDisplayNew) nameDisplayNew.innerText = userName;
            
            const tierDisplay = document.getElementById('headerPlanName');
            if (tierDisplay) tierDisplay.innerText = userTier;
        } else {
            // 💡 로그아웃 상태: 드롭다운 숨기기, 로그인 글자 보이기
            if (authArea) authArea.classList.add('hidden');
            if (guestArea) guestArea.classList.remove('hidden');
        }
    }, 100); 
}

// 💡 [핵심 추가] 신규 헤더(header.html)의 onclick="logout()" 버튼과 연결되는 함수
window.logout = function() {
    if (confirm("정말 로그아웃 하시겠습니까?")) {
        window.handleLogout(); // 기존에 만들어두신 로그아웃 로직을 그대로 실행합니다.
    }
};

// 로그아웃 처리 (전역 노출 - 기존 함수)
window.handleLogout = function() {
    if (logoutInterval) clearInterval(logoutInterval); // 돌아가던 90분 타이머 중지
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('managerName');
    localStorage.removeItem('userTier');
    location.href = 'index.html'; // 로그아웃 후 메인(index)으로 이동
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


// ---------------------------------------------
// 90분 자동 로그아웃 타이머 기능
// ---------------------------------------------
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
            
            // 정보 초기화
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('managerName');
            window.location.href = 'login.html'; // 타이머 종료 시 로그인 창으로 강제 이동
        }
    }, 1000);
}
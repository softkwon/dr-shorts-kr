// 날짜: 2026-03-05
// 코드이름: app.js
// 수정할 부분(내용): 로그인 시 첫 화면 대시보드 강제 이동 로직 및 헤더 사용자 메뉴 드롭다운 제어 기능 추가

function loadComponent(elementId, url) {
    const element = document.getElementById(elementId);
    if (element) {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('컴포넌트 로드 실패');
                return response.text();
            })
            .then(data => {
                element.innerHTML = data;
                if (elementId === 'header-placeholder') {
                    checkLoginState();
                }
            })
            .catch(error => console.error('Error:', error));
    }
}

// 1. 로그인 체크 및 페이지 이동 로직
window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentPage = window.location.pathname.split("/").pop();

    // 💡 수정사항: 로그인 상태에서 index.html 접속 시 대시보드로 강제 이동
    if (isLoggedIn && (currentPage === 'index.html' || currentPage === '')) {
        location.href = 'dashboard.html';
    }

    loadComponent('header-placeholder', 'header.html');
    loadComponent('footer-placeholder', 'footer.html');
});

function checkLoginState() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const authArea = document.getElementById('auth-area');
    const guestArea = document.getElementById('guest-area');
    
    // 💡 수정사항: 로그인 시 보일 사용자 이름 설정 (임시로 '영석' 사용)
    if (isLoggedIn && authArea && guestArea) {
        guestArea.classList.add('hidden');
        authArea.classList.remove('hidden');
    }
}

// 💡 수정사항: 사용자 이름 클릭 시 드롭다운 토글
window.toggleUserMenu = function() {
    const menu = document.getElementById('user-dropdown');
    menu.classList.toggle('hidden');
};

// 로그아웃 처리
window.handleLogout = function() {
    localStorage.removeItem('isLoggedIn');
    location.href = 'index.html';
};

// 외부 클릭 시 드롭다운 닫기
window.onclick = function(event) {
    if (!event.target.matches('.user-menu-btn')) {
        const dropdowns = document.getElementsByClassName("user-dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            let openDropdown = dropdowns[i];
            if (!openDropdown.classList.contains('hidden')) {
                openDropdown.classList.add('hidden');
            }
        }
    }
}
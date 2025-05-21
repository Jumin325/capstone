// components/Header.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

const Header = ({ keyword, setKeyword, onSearch }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const isBookPage = location.pathname === '/book';

  useEffect(() => {
    const adminStatus = sessionStorage.getItem('admin') === 'true';
    setIsAdmin(adminStatus);
  }, []);

const handleAdminLogin = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/admin-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login' }),
      credentials: 'include', // 꼭 필요함: 쿠키 기반 세션을 유지
    });

    const result = await response.json();

    if (result.success) {
      sessionStorage.clear(); // ⚠️ 서버 세션 재생성 이후에 클라이언트 세션 초기화
      sessionStorage.setItem('admin', 'true');
      setIsAdmin(true);
      alert('관리자 모드로 로그인되었습니다.');
      navigate('/'); // ✅ 메인 페이지로 이동
    } else {
      alert('로그인 실패');
    }
  } catch (err) {
    console.error('관리자 로그인 오류:', err);
    alert('서버 오류');
  }
};

const handleAdminLogout = async () => {
  sessionStorage.removeItem('admin');
  setIsAdmin(false);

  await fetch('http://localhost:5000/api/admin-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout' })
  });

  alert('관리자 모드가 종료되었습니다.');
  navigate('/');
};

  return (
    <>
      <header className="header">
        <div className="header-title" onClick={() => navigate('/')}>EasyFind</div>

        <div className="header-right">
        {isBookPage && (
          <div className="search-box">
            <input
              type="text"
              placeholder="도서 검색..."
              className="search-input"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
            <button className="search-button" onClick={onSearch}>검색</button>
          </div>
        )}

        <div className="admin-controls">
          {isAdmin ? (
            <button onClick={handleAdminLogout} className="admin-login-btn">관리자 로그아웃</button>
          ) : (
            <button onClick={handleAdminLogin} className="admin-login-btn">관리자 로그인</button>
          )}
          </div>
        </div>
      </header>

      <nav className="nav-menu">
        <ul>
          <li className={location.pathname === '/' ? 'active' : ''} onClick={() => navigate('/')}>메인</li>
          <li className={location.pathname === '/book' ? 'active' : ''} onClick={() => navigate('/book')}>도서 목록</li>
          <li className={location.pathname === '/cart' ? 'active' : ''} onClick={() => navigate('/cart')}>장바구니</li>
          <li className={location.pathname === '/reservation' ? 'active' : ''} onClick={() => navigate('/reservation')}>예약내역</li>
          <li className={location.pathname === '/inquiry' ? 'active' : ''} onClick={() => navigate('/inquiry')}>문의하기</li>
        </ul>
      </nav>
    </>
  );
};

export default Header;

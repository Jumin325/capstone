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
  sessionStorage.setItem('admin', 'true');
  setIsAdmin(true);

  // 백엔드에 알림 전송
  await fetch('http://localhost:5000/api/admin-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login' })
  });

  alert('관리자 모드로 전환되었습니다.');
  navigate('/');
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

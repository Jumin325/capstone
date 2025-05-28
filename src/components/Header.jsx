import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

const Header = ({ keyword, setKeyword, onSearch }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const isBookPage = location.pathname === '/book';

  // 최초 마운트 시 관리자 여부 체크
  useEffect(() => {
    const adminStatus = sessionStorage.getItem('admin') === 'true';
    setIsAdmin(adminStatus);
  }, []);

  // 관리자 로그인 처리
  const handleAdminLogin = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/api/admin-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login' }),
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        sessionStorage.clear();
        sessionStorage.setItem('admin', 'true');
        setIsAdmin(true);
        alert('관리자 모드로 로그인되었습니다.');
        navigate('/');
      } else {
        alert('로그인 실패');
      }
    } catch (err) {
      console.error('관리자 로그인 오류:', err);
      alert('서버 오류');
    }
  };

  // 관리자 로그아웃 처리
  const handleAdminLogout = async () => {
    sessionStorage.removeItem('admin');
    setIsAdmin(false);

    await fetch(`${process.env.REACT_APP_API_BASE}/api/admin-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });

    alert('관리자 모드가 종료되었습니다.');
    navigate('/');
  };

  return (
    <>
      <header className="header">
        <div className="header-title" onClick={() => navigate('/')}>
          EasyFind
        </div>

        <div className="header-right">
          {/* 도서 페이지일 때만 검색창 표시 */}
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
              <button className="search-button" onClick={onSearch}>
                검색
              </button>
            </div>
          )}

          <div className="admin-controls">
            {isAdmin ? (
              <button onClick={handleAdminLogout} className="admin-login-btn">
                관리자 로그아웃
              </button>
            ) : (
              <button onClick={handleAdminLogin} className="admin-login-btn">
                관리자 로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 하단 네비게이션 메뉴 */}
      <nav className="nav-menu">
        <ul>
          <li className={location.pathname === '/' ? 'active' : ''} onClick={() => navigate('/')}>
            메인
          </li>
          <li className={location.pathname === '/book' ? 'active' : ''} onClick={() => navigate('/book')}>
            도서 목록
          </li>
          <li className={location.pathname === '/cart' ? 'active' : ''} onClick={() => navigate('/cart')}>
            장바구니
          </li>
          <li className={location.pathname === '/reservation' ? 'active' : ''} onClick={() => navigate('/reservation')}>
            예약내역
          </li>
          <li className={location.pathname === '/inquiry' ? 'active' : ''} onClick={() => navigate('/inquiry')}>
            문의하기
          </li>
        </ul>
      </nav>
    </>
  );
};

export default Header;

// components/Header.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

const Header = ({ keyword, setKeyword, onSearch }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <header className="header">
        <div className="header-title" onClick={() => navigate('/')}>EasyFind</div>
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

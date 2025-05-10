import React from 'react';
import './MainPage.css';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBoxOpen, FaShoppingCart, FaClipboardList, FaHeadset, FaBook, FaStar, FaFire } from 'react-icons/fa';

const MainPage = () => {
  const navigate = useNavigate();

  return (
    <div className="main-container">
      <section className="hero">
        <div className="hero-content">
          <h1>EasyFind Bookstore</h1>
          <p>지식의 여정을 더 쉽고 빠르게.</p>
          <div className="hero-search">
            <input type="text" placeholder="도서명 또는 문구 검색..." />
            <button><FaSearch /></button>
          </div>
        </div>
      </section>

      <section className="main-menu">
        <div className="menu-item" onClick={() => navigate('/book')}><FaBoxOpen size={28} /><span>상품 탐색</span></div>
        <div className="menu-item" onClick={() => navigate('/cart')}><FaShoppingCart size={28} /><span>장바구니</span></div>
        <div className="menu-item" onClick={() => navigate('/reservation')}><FaClipboardList size={28} /><span>주문 내역</span></div>
        <div className="menu-item" onClick={() => navigate('/inquiry')}><FaHeadset size={28} /><span>고객센터</span></div>
      </section>

      <section className="recommend-section">
        <h2>추천 상품</h2>
        <div className="recommend-items">
          <div className="recommend-item"><FaBook /> 오늘의 책</div>
          <div className="recommend-item"><FaStar /> 신간 도서</div>
          <div className="recommend-item"><FaFire /> 인기 문구</div>
        </div>
      </section>

      <section className="event-banner">
        📢 3월 한정, 모든 상품 무료 배송 이벤트 진행 중!
      </section>

      <footer className="footer">
        <p>© 2025 EasyFind. All rights reserved.</p>
        <p>문의: easyfind@support.com</p>
      </footer>
    </div>
  );
};

export default MainPage;

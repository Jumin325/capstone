import React from 'react';
import './MainPage.css'; // 스타일 분리

const MainPage = () => {
  return (
    <div className="container">
      <h1 className="title">메인 화면</h1>

      <div className="main-buttons">
        <button className="action-button">구매내역</button>
        <button className="action-button">상품조회</button>
      </div>

      <div className="footer">
        <button className="footer-button">공지사항</button>
        <button className="footer-button">이용 방법 안내</button>
      </div>
    </div>
  );
};

export default MainPage;

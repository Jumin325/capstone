import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './OrderDetails.css';
import { QRCodeCanvas } from 'qrcode.react';
import { FaSearch } from 'react-icons/fa';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState(null);

  const goToMainPage = () => navigate('/');
  const goToBookPage = () => navigate('/book');
  const goToCartPage = () => navigate('/cart');
  const goToReservationPage = () => navigate('/reservation');
  const goToInquiryPage = () => navigate('/inquiry');

  const formatKoreanDate = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date).replace(/\. /g, '-').replace('.', '');
  };

  const formatPrice = (price) => {
    return `${Math.round(price).toLocaleString()}원`;
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/order-details/${orderId}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('주문 정보를 불러오는 데 실패했습니다.');
        const data = await response.json();
        setOrderData(data);
      } catch (error) {
        console.error('주문 정보 요청 오류:', error);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  if (!orderData) return <div className="loading">로딩 중...</div>;

  return (
    <div>
      <div className="bookstore-container">
        {/* 헤더 */}
        <header className="header">
          <div className="header-title" onClick={goToMainPage}>EasyFind</div>
          <div className="search-box">
            <input type="text" placeholder="도서 검색..." className="search-input" />
            <button className="search-button"><FaSearch /></button>
          </div>
        </header>

        {/* 네비게이션 */}
        <nav className="nav-menu">
          <ul>
            <li onClick={goToMainPage}>메인</li>
            <li onClick={goToBookPage}>도서 목록</li>
            <li className="active" onClick={goToCartPage}>장바구니</li>
            <li onClick={goToReservationPage}>예약내역</li>
            <li onClick={goToInquiryPage}>문의하기</li>
          </ul>
        </nav>
      </div>

      {/* 내용 */}
      <main className="main-content">
        <div className="bookstore-container order-align-wrapper">
          <div className="order-card">
            <h2>주문번호: ORD{orderData.orderId}</h2>
            <p>주문일시: {formatKoreanDate(orderData.orderDate)}</p>

            <ul className="order-list">
              {orderData.items.map((item, idx) => (
                <li key={idx}>
                  <span className="icon-box">🟦</span>
                  {item.name} - 저자 {item.author} ({formatPrice(item.price)})
                </li>
              ))}
            </ul>

            <h3>총 금액: {formatPrice(orderData.totalAmount)}</h3>

            <div className="qr-box">
              <QRCodeCanvas value={`ORD${orderData.orderId}`} size={128} />
            </div>

            <button className="close-btn" onClick={() => navigate('/cart')}>
              닫기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderDetails;

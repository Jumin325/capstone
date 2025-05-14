import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './OrderDetails.css';
import { QRCodeCanvas } from 'qrcode.react';
import Header from '../components/Header';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState(null);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/order-details/${orderId}`, {
          credentials: 'include'
        });
        const result = await response.json();
        setOrderData(result);
      } catch (err) {
        console.error('결제 내역 조회 오류:', err);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  const formatPrice = (price) => `${Number(price).toLocaleString()}원`;

  if (!orderData) return <div className="loading">결제 내역을 불러오는 중입니다...</div>;

  return (
    <div className="bookstore-container order-details-page">
      <Header keyword={keyword} setKeyword={setKeyword} />

      {/* 본문 */}
      <main className="main-content">
        <div className="order-container">
          <h2 className="order-title">내 결제 내역</h2>
          <hr className="order-divider" />

          <div className="order-card">
            <h3 className="order-id">주문번호: ORD{orderData.orderId}</h3>
            <p className="order-date">주문일시: {orderData.orderDate}</p>

            <ul className="order-list">
              {orderData.items.map((item, index) => (
                <li key={index}>
                  <span className="icon-box">🟦</span>
                  {item.name} - 저자 {item.author} ({formatPrice(item.price)})
                </li>
              ))}
            </ul>

            <h3 className="order-total">총 금액: {formatPrice(orderData.totalAmount)}</h3>

            <div className="qr-box">
              <QRCodeCanvas value={`ORD${orderData.orderId}`} size={128} />
            </div>

            <button className="close-btn" onClick={() => navigate('/book')}>닫기</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderDetails;

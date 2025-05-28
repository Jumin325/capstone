import React, { useState, useEffect } from 'react';
import './ReservationPage.css';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import Header from '../components/Header';

const ReservationPage = () => {
  const [phoneTail, setPhoneTail] = useState('');
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);


  // ✅ 관리자면 자동 조회
  useEffect(() => {
    const adminStatus = sessionStorage.getItem('admin') === 'true';
    setIsAdmin(adminStatus);
    if (adminStatus) {
      setPhoneTail('admin');
      setShowModal(false);
    }
  }, []);

  useEffect(() => {
    if (!showModal && phoneTail) {
      fetchOrders();
    }
  }, [showModal, phoneTail]);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/api/reservation?tail=${phoneTail}`);
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders);
      } else {
        setError(data.message || '조회 실패');
      }
    } catch (err) {
      setError('서버 요청 실패');
    }
  };

  // 주문 내역 조회시 전화번호 뒷 4자리 비교
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();

    if (phoneTail.trim().length !== 4) {
      setError('전화번호 뒷자리 4자리를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/api/reservation?tail=${phoneTail}`);
      const data = await response.json();

      if (data.success && data.orders.length > 0) {
        setOrders(data.orders);
        setShowModal(false);  // ✅ 주문이 있을 때만 모달 닫기
      } else {
        setError('일치하는 주문이 없습니다.');
      }
    } catch (err) {
      setError('서버 요청 실패');
    }
  };

  const handleComplete = async (orderId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/api/receipt/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      if (response.ok) {
        setSelectedOrder(prev => ({
          ...prev,
          receipt_status: '수령',
          receipt_date: new Date().toISOString()
        }));

        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.order_id === orderId
              ? { ...order, receipt_status: '수령' }
              : order
          )
        );
      } else {
        alert('수령 처리 실패');
      }
    } catch (error) {
      console.error('수령 처리 오류:', error);
    }
  };

  //주문 목록 카드랑 receipt_status 상태 동기화
  const handleSelectOrder = async (orderId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/api/reservation/${orderId}`);
      const data = await response.json();
      if (data.success) {
        const latestOrder = data.order;

        // ✅ 모달창용 상태 업데이트
        setSelectedOrder(latestOrder);

        // ✅ 카드에 표시되는 목록도 최신 상태로 갱신
        setOrders(prev =>
          prev.map(order =>
            order.order_id === latestOrder.order_id
              ? { ...order, receipt_status: latestOrder.receipt_status }
              : order
          )
        );
      } else {
        alert('주문 상세 정보를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('주문 상세 조회 실패:', err);
      alert('서버 오류');
    }
  };

  return (
    <div className="bookstore-container">
      <Header keyword={keyword} setKeyword={setKeyword} />

      {/* 전화번호 모달: 관리자면 안 보임 */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>전화번호 뒷자리 4자리를 입력해주세요</h3>
            <form onSubmit={handlePhoneSubmit}>
              <input
                type="text"
                maxLength="4"
                value={phoneTail}
                onChange={(e) => setPhoneTail(e.target.value)}
                placeholder="예: 1234"
                className="reservation-input"
              />
              <div className="modal-buttons">
                <button type="submit" className="reservation-button">확인</button>
                <button type="button" className="reservation-button cancel-btn" onClick={() => navigate('/')}>돌아가기</button>
              </div>
            </form>
            {error && <p className="error-message">{error}</p>}
          </div>
        </div>
      )}

      {/* 주문 목록 카드 */}
      {!showModal && (
        <div className="book-list">
          {orders.length === 0 ? (
            <p className="empty-orders-message">등록된 주문 내역이 없습니다.</p>
          ) : (
            orders.map((order) => (
              <div
                key={order.order_id}
                className="book-card"
                onClick={() => handleSelectOrder(order.order_id)}
              >
                <div className="book-title">주문번호: {order.order_id}</div>
                <p className="book-author">대표 상품: {order.representative_product}</p>
                <p className="book-publisher">
                  주문일자: {new Date(order.order_date).toLocaleString('ko-KR')}
                </p>
                <p className="book-price">총 수량 : {order.total_quantity}개</p>
                <p className="book-price">총 금액 : {Math.round(order.total_amount).toLocaleString()}원</p>
                <p className="book-price">
                  수령 여부:{' '}
                <strong style={{
                  color:
                    order.receipt_status?.trim() === '수령' ? 'green' :
                    order.receipt_status?.trim() === '취소' ? 'red' :
                    'orange'
                }}>
                  {order.receipt_status?.trim() || '대기'}
                </strong>
                </p>
                <button className="add-to-cart-btn">상세보기</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 상세 모달 */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>📦 주문 상세 정보</h3>
            <p>주문번호: {selectedOrder.order_id}</p>
            <p>대표 상품: {selectedOrder.representative_product}</p>
            <p>주문일자: {new Date(selectedOrder.order_date).toLocaleString('ko-KR')}</p>
            <ul className="item-list">
              {selectedOrder.items?.map((item, idx) => (
                <li key={idx}>
                  {item.name} - {item.author} ({(item.price * item.quantity).toLocaleString()}원)
                </li>
              ))}
            </ul>
            <p>총 수량: {selectedOrder.total_quantity}개</p>
            <p className="order-amount">
              총 금액: <span>{Math.round(selectedOrder.total_amount).toLocaleString()}원</span>
            </p>

            <p className={`receipt-status`}>
              수령 여부:{' '}
              <strong style={{
                color:
                  selectedOrder.receipt_status?.trim() === '수령' ? 'green' :
                  selectedOrder.receipt_status?.trim() === '취소' ? 'red' :
                  'orange'
              }}>
                {selectedOrder.receipt_status?.trim() || '대기'}
              </strong>
            </p>

            {isAdmin && selectedOrder.receipt_status?.trim() !== '수령' && (
              <button className="complete-receipt-btn" onClick={() => handleComplete(selectedOrder.order_id)}>
                수령 완료
              </button>
            )}
            {isAdmin && selectedOrder.phone && (
              <p>전화번호 뒷자리: {selectedOrder.phone.slice(-4)}</p>
            )}



            <div className="qr-box">
              <QRCodeCanvas value={`${process.env.REACT_APP_QR_URL}/order-details/${selectedOrder.order_id}`} size={120} />
            </div>
            <button onClick={() => setSelectedOrder(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationPage;
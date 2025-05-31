import React, { useState, useEffect } from 'react';
import './BookPage.css';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneLastDigits, setPhoneLastDigits] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [keyword, setKeyword] = useState('');

  const navigate = useNavigate();
  const goToBookPage = () => navigate('/book');

  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/api/cart`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('장바구니 정보를 가져오는데 실패했습니다.');
      const result = await response.json();
      setCartItems(result.items || []);
      setSessionId(result.session_id || '');
      setError(null);
    } catch (err) {
      setError('장바구니를 불러오는 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = async (orderItemId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await fetch(`${process.env.REACT_APP_API_BASE}/api/cart/item/${orderItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quantity: newQuantity }),
      });
      fetchCartItems();
    } catch (error) {
      alert('수량 변경 실패: ' + error.message);
    }
  };

  const handleRemoveItem = async (orderItemId) => {
    try {
      await fetch(`${process.env.REACT_APP_API_BASE}/api/cart/item/${orderItemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchCartItems();
      alert('상품이 삭제되었습니다.');
    } catch (error) {
      alert('삭제 실패: ' + error.message);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('장바구니에 상품이 없습니다.');
      return;
    }
    setIsModalOpen(true);
  };

  const confirmPayment = async () => {
    if (!sessionId) return alert('세션 정보가 없습니다.');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/api/complete-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId }),
      });
      const result = await response.json();
      if (result.success && result.orderId) {
        setIsModalOpen(false);
        setShowPhoneModal(true);
      } else {
        alert(result.error || '결제 중 문제가 발생했습니다.');
      }
    } catch (error) {
      alert('결제 처리 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const submitPhoneNumber = async () => {
    if (!/^\d{4}$/.test(phoneLastDigits)) {
      alert('전화번호 뒷자리 4자리를 정확히 입력하세요.');
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/api/save-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId, phone_tail: phoneLastDigits }),
      });
      const result = await response.json();
      if (result.success && result.orderId) {
        setShowPhoneModal(false);
        navigate(`/order-details/${result.orderId}`);
      } else {
        alert('전화번호 저장에 실패했습니다.');
      }
    } catch (error) {
      alert('서버 오류: ' + error.message);
    }
  };

  return (
    <div className="bookstore-container">
      <Header keyword={keyword} setKeyword={setKeyword} />

      <div className="cart-container">
        <h2 className="cart-title">🛒 장바구니</h2>

        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : cartItems.length === 0 ? (
          <div className="empty-cart">
            <p>장바구니가 비어 있습니다.</p>
            <button className="continue-shopping-btn" onClick={goToBookPage}>쇼핑 계속하기</button>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              <div className="cart-header">
                <div className="cart-header-item product-info">상품정보</div>
                <div className="cart-header-item">수량</div>
                <div className="cart-header-item">가격</div>
                <div className="cart-header-item">합계</div>
                <div className="cart-header-item">삭제</div>
              </div>
              {cartItems.map((item) => (
                <div key={item.order_item_id} className="cart-item">
                  <div className="product-info">
                    <div className="product-image">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} />
                      ) : <div className="placeholder">상품 이미지</div>}
                    </div>
                    <div className="product-details">
                      <h3>{item.product_name}</h3>
                      {item.author && <p>저자: {item.author}</p>}
                      {item.publisher && <p>출판사: {item.publisher}</p>}
                    </div>
                  </div>

                  <div className="quantity-controls">
                    <button onClick={() => handleQuantityChange(item.order_item_id, item.quantity - 1)} disabled={item.quantity <= 1}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => handleQuantityChange(item.order_item_id, item.quantity + 1)}>+</button>
                  </div>

                  <div className="price">
                    {item.original_price > item.price_per_item ? (
                      <>
                        <span className="original-price">{Number(item.original_price).toLocaleString()}원</span>
                        <span className="sale-price">{Number(item.price_per_item).toLocaleString()}원</span>
                        <span className="discount-rate">
                          ({Math.round(((item.original_price - item.price_per_item) / item.original_price) * 100)}%)
                        </span>
                      </>
                    ) : (
                      <span className="sale-price">{Number(item.price_per_item).toLocaleString()}원</span>
                    )}
                  </div>

                  <div className={`item-total ${item.original_price > item.price_per_item ? 'discounted' : ''}`}>
                    {Number(item.price_per_item * item.quantity).toLocaleString()}원
                  </div>
                  <div className="remove-item">
                    <button onClick={() => handleRemoveItem(item.order_item_id)}>삭제</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="order-summary">
              {(() => {
                const originalTotal = cartItems.reduce(
                  (sum, item) => sum + (item.original_price ?? item.price_per_item) * item.quantity,
                  0
                );
                const discountedTotal = cartItems.reduce(
                  (sum, item) => sum + item.price_per_item * item.quantity,
                  0
                );
                const discountRate = originalTotal > 0
                  ? Math.round(((originalTotal - discountedTotal) / originalTotal) * 100)
                  : 0;

                return (
                  <>
                    <div className="summary-line"><span>총 원가</span><span>{originalTotal.toLocaleString()}원</span></div>
                    <div className="summary-line"><span>할인 적용 금액</span><span>{discountedTotal.toLocaleString()}원</span></div>
                    {discountRate > 0 && (
                      <div className="summary-line discount-rate">
                        <span>총 할인률</span><span>{discountRate}% ↓</span>
                      </div>
                    )}
                    <div className="summary-total"><span>결제 예정금액</span><span>{discountedTotal.toLocaleString()}원</span></div>
                    <button className="checkout-button" onClick={handleCheckout}>결제하기</button>
                    <button className="continue-shopping" onClick={goToBookPage}>쇼핑 계속하기</button>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>결제 확인</h3>
            <p>총 결제 금액: {
              cartItems.reduce((sum, item) => sum + item.price_per_item * item.quantity, 0).toLocaleString()
            }원</p>
            <div className="modal-buttons">
              <button onClick={confirmPayment}>확인</button>
              <button onClick={() => setIsModalOpen(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {showPhoneModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', padding: '20px' }}>
            <h3 style={{ marginBottom: '10px' }}>전화번호 뒷자리 4자리를 입력해주세요</h3>
            <input
              type="text"
              maxLength="4"
              value={phoneLastDigits}
              onChange={(e) => setPhoneLastDigits(e.target.value)}
              placeholder="예: 1234"
              style={{ width: '100px', textAlign: 'center', fontSize: '1.2em', marginBottom: '15px' }}
            />
            <div className="modal-buttons" style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button onClick={submitPhoneNumber}>확인</button>
              <button onClick={() => setShowPhoneModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;

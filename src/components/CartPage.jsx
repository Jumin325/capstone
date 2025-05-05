import React, { useState, useEffect } from 'react';
import './BookPage.css'; // 기존 CSS 재사용
import { useNavigate } from 'react-router-dom';

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);

  const navigate = useNavigate();

  const goToMainPage = () => {
    navigate('/'); // 메인 페이지로 이동
  };

  const goToBookPage = () => {
    navigate('/book'); // 도서 목록 페이지로 이동
  };

  useEffect(() => {
    fetchCartItems();
  }, []);

  // 장바구니 아이템 불러오기
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/cart', {
        credentials: 'include' // 세션 쿠키 포함
      });
      
      if (!response.ok) {
        throw new Error('장바구니 정보를 가져오는데 실패했습니다.');
      }
      
      const result = await response.json();
      setCartItems(result.items || []);
      calculateTotal(result.items || []);
      setError(null);
    } catch (err) {
      setError('장바구니를 불러오는 중 오류가 발생했습니다: ' + err.message);
      console.error('장바구니 API 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 총 금액 계산
  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => sum + (item.price_per_item * item.quantity), 0);
    setTotalAmount(total);
  };

  // 수량 변경 처리
  const handleQuantityChange = async (orderItemId, newQuantity) => {
    if (newQuantity < 1) return; // 최소 수량은 1

    try {
      const response = await fetch(`http://localhost:5000/api/cart/item/${orderItemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (!response.ok) {
        throw new Error('수량 변경에 실패했습니다.');
      }

      // 성공하면 장바구니 다시 불러오기
      fetchCartItems();
    } catch (error) {
      console.error('수량 변경 오류:', error);
      alert('수량 변경에 실패했습니다: ' + error.message);
    }
  };

  // 장바구니 아이템 삭제
  const handleRemoveItem = async (orderItemId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/cart/item/${orderItemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('아이템 삭제에 실패했습니다.');
      }

      // 성공하면 장바구니 다시 불러오기
      fetchCartItems();
      alert('상품이 장바구니에서 삭제되었습니다.');
    } catch (error) {
      console.error('아이템 삭제 오류:', error);
      alert('아이템 삭제에 실패했습니다: ' + error.message);
    }
  };

  // 주문 처리
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('장바구니에 상품이 없습니다.');
      return;
    }
    
    // 여기에 결제 페이지로 이동하는 로직 추가
    alert('주문 처리 페이지로 이동합니다.');
    // navigate('/checkout');
  };

  return (
    <div className="bookstore-container">
      {/* 헤더 영역 */}
      <header className="header">
        <div className="header-title" onClick={goToMainPage} style={{ cursor: 'pointer'}}> EasyFind </div>
        <div className="search-box">
          <input type="text" placeholder="도서 검색..." className="search-input" />
          <button className="search-button">검색</button>
        </div>
      </header>

      {/* 네비게이션 메뉴 - 장바구니 메뉴에 active 클래스 추가 */}
      <nav className="nav-menu">
        <ul>
          <li onClick={goToMainPage}>메인</li>
          <li onClick={goToBookPage}>도서 목록</li>
          <li className="active">장바구니</li>
          <li>예약내역</li>
          <li>문의하기</li>
        </ul>
      </nav>

      {/* 장바구니 콘텐츠 영역 */}
      <div className="cart-container">
        <h2 className="cart-title">장바구니</h2>
        
        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : cartItems.length === 0 ? (
          <div className="empty-cart">
            <p>장바구니가 비어 있습니다.</p>
            <button className="continue-shopping-btn" onClick={goToBookPage}>
              쇼핑 계속하기
            </button>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              {/* 장바구니 헤더 */}
              <div className="cart-header">
                <div className="cart-header-item product-info">상품정보</div>
                <div className="cart-header-item">수량</div>
                <div className="cart-header-item">가격</div>
                <div className="cart-header-item">합계</div>
                <div className="cart-header-item">삭제</div>
              </div>
              
              {/* 장바구니 아이템 목록 */}
              {cartItems.map((item) => (
                <div key={item.order_item_id} className="cart-item">
                  <div className="product-info">
                    <div className="product-image">
                      {item.image_url ? 
                        <img src={item.image_url} alt={item.product_name} /> :
                        <div className="placeholder">상품 이미지</div>
                      }
                    </div>
                    <div className="product-details">
                      <h3>{item.product_name}</h3>
                      {item.author && <p>저자: {item.author}</p>}
                      {item.publisher && <p>출판사: {item.publisher}</p>}
                    </div>
                  </div>
                  
                  <div className="quantity-controls">
                    <button 
                      onClick={() => handleQuantityChange(item.order_item_id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button 
                      onClick={() => handleQuantityChange(item.order_item_id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  
                  <div className="price">
                    {Number(item.price_per_item).toLocaleString()}원
                  </div>
                  
                  <div className="item-total">
                    {Number(item.price_per_item * item.quantity).toLocaleString()}원
                  </div>
                  
                  <div className="remove-item">
                    <button onClick={() => handleRemoveItem(item.order_item_id)}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 결제 정보 */}
            <div className="order-summary">
              <div className="summary-line">
                <span>총 상품금액</span>
                <span>{Number(totalAmount).toLocaleString()}원</span>
              </div>
              <div className="summary-total">
                <span>결제 예정금액</span>
                <span>{Number(totalAmount).toLocaleString()}원</span>
              </div>
              <button 
                className="checkout-button" 
                onClick={handleCheckout}
                disabled={cartItems.length === 0}
              >
                결제하기
              </button>
              <button className="continue-shopping" onClick={goToBookPage}>
                쇼핑 계속하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
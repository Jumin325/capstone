import React, { useState } from 'react';
import './InquiryPage.css';
import { useNavigate, useLocation } from 'react-router-dom';

const InquiryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showForm, setShowForm] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [inquiry, setInquiry] = useState('');

  const goToMainPage = () => navigate('/');
  const goToBookPage = () => navigate('/book');
  const goToCartPage = () => navigate('/cart');
  const goToReservationPage = () => navigate('/reservation');
  const goToInquiryPage = () => navigate('/inquiry');

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('문의가 등록되었습니다.');
    setInquiry('');
    setShowForm(false);
  };

  const faqList = [
    {
      question: '배송은 얼마나 걸리나요?',
      answer: '일반적으로 배송은 2~3일 소요됩니다.',
    },
    {
      question: '주문 취소는 어떻게 하나요?',
      answer: '장바구니 상태에서는 주문을 취소할 수 있습니다.',
    },
  ];

  return (
    <div>
      <div className="bookstore-container">
        {/* Header */}
        <header className="header">
          <div className="header-title" onClick={goToMainPage}>EasyFind</div>
          <div className="search-box">
            <input type="text" placeholder="도서 검색..." className="search-input" />
            <button className="search-button">검색</button>
          </div>
        </header>

        {/* Navigation */}
        <nav className="nav-menu">
          <ul>
            <li className={location.pathname === '/' ? 'active' : ''} onClick={goToMainPage}>메인</li>
            <li className={location.pathname === '/book' ? 'active' : ''} onClick={goToBookPage}>도서 목록</li>
            <li className={location.pathname === '/cart' ? 'active' : ''} onClick={goToCartPage}>장바구니</li>
            <li className={location.pathname === '/reservation' ? 'active' : ''} onClick={goToReservationPage}>예약내역</li>
            <li className={location.pathname === '/inquiry' ? 'active' : ''} onClick={goToInquiryPage}>문의하기</li>
          </ul>
        </nav>
      </div>

      <main className="main-content">
        <div className="bookstore-container inquiry-wrapper">
          <h2 className="inquiry-title">자주 묻는 질문</h2>

          <div className="faq-section">
            {faqList.map((item, index) => (
              <div key={index} className="faq-item" onClick={() => toggleExpand(index)}>
                <div className="faq-question">{item.question}</div>
                {expandedIndex === index && (
                  <div className="faq-answer">{item.answer}</div>
                )}
              </div>
            ))}
          </div>

          <div className="write-section">
            <button className="write-button" onClick={() => setShowForm(!showForm)}>글쓰기</button>
            {showForm && (
              <form className="inquiry-form" onSubmit={handleSubmit}>
                <textarea
                  value={inquiry}
                  onChange={(e) => setInquiry(e.target.value)}
                  placeholder="문의 내용은 공개될수 있습니다."
                  required
                />
                <button type="submit">제출</button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default InquiryPage;
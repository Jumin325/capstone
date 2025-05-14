import React, { useState, useEffect } from 'react';
import './InquiryPage.css';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const InquiryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [inquiry, setInquiry] = useState('');
  const [password, setPassword] = useState('');
  const [answers, setAnswers] = useState({}); // { questionId: answer }

  // 네비게이션
  const goToMainPage = () => navigate('/');
  const goToBookPage = () => navigate('/book');
  const goToCartPage = () => navigate('/cart');
  const goToReservationPage = () => navigate('/reservation');
  const goToInquiryPage = () => navigate('/inquiry');

  const fetchQuestions = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/questions');
      setQuestions(res.data);
    } catch (err) {
      console.error('질문 목록 로딩 오류:', err);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inquiry.trim() || !password.trim()) {
      return alert('문의 내용과 비밀번호를 모두 입력해주세요.');
    }

    try {
      const { data } = await axios.post('http://localhost:5000/api/questions', {
        question: inquiry,
        password: password
      });
      alert('문의가 성공적으로 등록되었습니다.');
      setInquiry('');
      setPassword('');
      setShowForm(false);
      fetchQuestions();
    } catch (err) {
      console.error(err);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  const verifyPassword = async (questionId) => {
    const input = prompt('비밀번호를 입력하세요');
    if (!input) return;

    try {
      const res = await axios.post('http://localhost:5000/api/questions/verify', {
        questionId,
        password: input
      });

      setAnswers(prev => ({ ...prev, [questionId]: res.data.answer }));
    } catch (err) {
      alert(err.response?.data?.error || '오류가 발생했습니다.');
    }
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
      {/* Header */}
      <div className="bookstore-container">
        <header className="header">
          <div className="header-title" onClick={goToMainPage}>EasyFind</div>
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

      {/* Main Content */}
      <main className="main-content">
        <div className="bookstore-container inquiry-wrapper">
          <h2 className="inquiry-title">자주 묻는 질문</h2>

          {/* FAQ */}
          <div className="faq-section">
            {faqList.map((item, index) => (
              <div key={`faq-${index}`} className="faq-item">
                <div className="faq-question">{item.question}</div>
                <div className="faq-answer">{item.answer}</div>
              </div>
            ))}
          </div>

          {/* 글쓰기 */}
          <div className="write-section">
            <button className="write-button" onClick={() => setShowForm(!showForm)}>글쓰기</button>
            {showForm && (
              <form className="inquiry-form" onSubmit={handleSubmit}>
                <textarea
                  value={inquiry}
                  onChange={(e) => setInquiry(e.target.value)}
                  placeholder="문의 내용은 공개될 수 있습니다."
                  rows={5}
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                />
                <button type="submit">제출</button>
              </form>
            )}
          </div>

          {/* 문의 목록 */}
          <div className="question-list">
            <h3>문의 목록</h3>
            {questions.map((item) => (
              <div
                key={item.question_id}
                className="faq-item"
                onClick={() => {
                  if (answers[item.question_id]) return; // 이미 열람된 질문은 재클릭 막기
                  verifyPassword(item.question_id);
                }}
              >
                <div className="faq-question">{item.question}</div>
                {answers[item.question_id] && (
                  <div className="faq-answer">{answers[item.question_id]}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default InquiryPage;

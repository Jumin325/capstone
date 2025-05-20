import React, { useState } from 'react';
import './InquiryPage.css';
import axios from 'axios';
import Header from '../components/Header'; // ✅ 헤더 컴포넌트 추가

const InquiryPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [inquiry, setInquiry] = useState('');
  const [password, setPassword] = useState('');
  const [answers, setAnswers] = useState({});
  const [myQuestions, setMyQuestions] = useState([]);
  const [myQuestionsVisible, setMyQuestionsVisible] = useState(false);
  const [keyword, setKeyword] = useState(''); // ✅ 검색 입력 상태

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inquiry.trim() || !password.trim()) {
      return alert('문의 내용과 비밀번호를 모두 입력해주세요.');
    }
    try {
      await axios.post('http://localhost:5000/api/questions', {
        question: inquiry,
        password: password
      });
      alert('문의가 성공적으로 등록되었습니다.');
      setInquiry('');
      setPassword('');
      setShowForm(false);
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
      setAnswers((prev) => ({ ...prev, [questionId]: res.data.answer }));
    } catch (err) {
      alert(err.response?.data?.error || '오류가 발생했습니다.');
    }
  };

  const handleCheckMyQuestions = async () => {
    const input = prompt('문의 시 사용한 비밀번호를 입력하세요');
    if (!input) return;
    try {
      const res = await axios.post('http://localhost:5000/api/my-questions', {
        password: input
      });
      setMyQuestions(res.data.questions);
      setMyQuestionsVisible(true);
    } catch (err) {
      alert(err.response?.data?.error || '문의 조회 실패');
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
    <div className="bookstore-container">
      {/* ✅ 공통 헤더 적용 */}
      <Header keyword={keyword} setKeyword={setKeyword} />

      <main className="main-content">
        <div className="inquiry-wrapper">
          <h2 className="inquiry-title">자주 묻는 질문</h2>

          <div className="faq-section">
            {faqList.map((item, index) => (
              <div key={`faq-${index}`} className="faq-item">
                <div className="faq-question">{item.question}</div>
                <div className="faq-answer">{item.answer}</div>
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
                  placeholder="내용을 입력하세요."
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
            <button className="check-my-questions-button" onClick={handleCheckMyQuestions}>내 문의 확인하기</button>
          </div>

          {myQuestionsVisible && (
            <div className="question-list">
              <h3>내 문의 내역</h3>
              {myQuestions.length > 0 ? (
                myQuestions.map((item) => (
                  <div key={item.question_id} className="faq-item">
                    <div className="faq-question">{item.question}</div>
                    <div className="faq-answer">{item.answer || '답변 준비 중입니다.'}</div>
                  </div>
                ))
              ) : (
                <div className="empty-question-box">
                  <div className="no-questions">등록된 문의가 없습니다.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InquiryPage;

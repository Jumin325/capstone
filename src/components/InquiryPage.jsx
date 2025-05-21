import React, { useState, useEffect } from 'react';
import './InquiryPage.css';
import axios from 'axios';
import Header from '../components/Header';

const InquiryPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [inquiry, setInquiry] = useState('');
  const [password, setPassword] = useState('');
  const [answers, setAnswers] = useState({});
  const [myQuestions, setMyQuestions] = useState([]);
  const [myQuestionsVisible, setMyQuestionsVisible] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [answerInputs, setAnswerInputs] = useState({});

  useEffect(() => {
    const adminStatus = sessionStorage.getItem('admin') === 'true';
    if (adminStatus) {
      setIsAdmin(true);
      fetchInquiries('admin');
    }
  }, []);

  const fetchInquiries = async (phoneTail) => {
    try {
      const response = await fetch(`http://localhost:5000/api/inquiries?phoneTail=${phoneTail}`);
      const data = await response.json();
      setInquiries(data);
    } catch (error) {
      console.error('문의 불러오기 실패:', error);
    }
  };

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

  const handleAnswerSubmit = async (questionId) => {
    const content = answerInputs[questionId];
    try {
      await axios.put(`http://localhost:5000/api/questions/${questionId}/answer`, {
        answer: content,
      });

      setInquiries((prev) =>
        prev.map((q) =>
          q.question_id === questionId ? { ...q, answer: content } : q
        )
      );

      setAnswerInputs((prev) => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
    } catch (err) {
      alert('답변 저장 실패');
    }
  };

  const faqList = [
    { question: '상품은 언제 준비되나요?', answer: '결제 당일~다음날 오후 안에 준비하고 있습니다.' },
    { question: '결제 후 몇일 이내 수령해야 하나요?', answer: '결제 후 5일 이내로 연락이 없다면 결제가 취소됩니다. 환불은 매장에 방문하거나 전화 바랍니다.' },
    { question: '주문 취소는 어떻게 하나요?', answer: '장바구니 결제 전에는 취소가 가능하고, 이미 결제한 경우 매장에 전화 바랍니다.' },
    { question: '재고는 언제 들어오나요?', answer: '보통 매주 월요일, 수요일날 들어옵니다.' },
    { question: '교재가 안보여요', answer: '재고가 전부 소진된 경우 보이지 않게 설정되어 있습니다.' },
    { question: '문의 답변은 언제 해주시나요?', answer: '매주 수요일과 금요일, 주 2회 정기적으로 처리하고 있습니다' },
  ];

  return (
    <div className="bookstore-container">
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
          
          {!isAdmin && (
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

            
              <button className="check-my-questions-button" onClick={handleCheckMyQuestions}>
                내 문의 확인하기
              </button>
              </div>
            )}
          
          {isAdmin && (
            <div className="question-list">
              <h3>전체 문의 내역 (관리자)</h3>
              {inquiries.length > 0 ? (
                inquiries.map((item) => (
                  <div key={item.question_id} className="faq-item">
                    <div
                      className="faq-question"
                      onClick={() =>
                        setAnswerInputs((prev) => ({
                          ...prev,
                          [item.question_id]: prev[item.question_id] !== undefined
                            ? undefined
                            : item.answer || '',
                        }))
                      }
                    >
                      {item.question}
                    </div>
                    <div className="faq-answer">{item.answer || '답변 준비 중입니다.'}</div>

                    {answerInputs[item.question_id] !== undefined && (
                      <div className="answer-form">
                        <textarea
                          value={answerInputs[item.question_id]}
                          onChange={(e) =>
                            setAnswerInputs((prev) => ({
                              ...prev,
                              [item.question_id]: e.target.value,
                            }))
                          }
                          placeholder="답변을 입력하세요"
                        />
                        <button
                          onClick={() => handleAnswerSubmit(item.question_id)}
                          className="submit-btn"
                        >
                          저장
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-question-box">
                  <div className="no-questions">등록된 문의가 없습니다.</div>
                </div>
              )}
            </div>
          )}

          {myQuestionsVisible && !isAdmin && (
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
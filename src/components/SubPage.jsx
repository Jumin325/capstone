// components/SubPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function SubPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // 컴포넌트가 마운트될 때 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 백엔드 API에서 데이터 가져오기
        const response = await axios.get('http://localhost:5000/api/data');
        
        // API 응답에서 데이터 추출
        setData(response.data.data);
        setLoading(false);
      } catch (err) {
        console.error('데이터를 불러오는 중 오류 발생:', err);
        setError('데이터를 불러오는 데 실패했습니다.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 메인 페이지로 돌아가는 함수
  const handleBackClick = () => {
    navigate('/');
  };

  // 로딩 중일 때 표시할 내용
  if (loading) {
    return <div className="loading">데이터를 불러오는 중입니다...</div>;
  }

  // 오류가 발생했을 때 표시할 내용
  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={handleBackClick}>메인으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className="sub-page">
      <h1>데이터베이스 조회 결과</h1>
      
      {/* 데이터가 없을 경우 */}
      {data.length === 0 ? (
        <p>조회된 데이터가 없습니다.</p>
      ) : (
        // 데이터 테이블로 표시
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {/* 데이터의 첫 번째 행의 키를 기반으로 테이블 헤더 생성 */}
              {Object.keys(data[0]).map((key) => (
                <th key={key} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 데이터 행 표시 */}
            {data.map((item, index) => (
              <tr key={index}>
                {Object.values(item).map((value, idx) => (
                  <td key={idx} style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {/* 메인으로 돌아가는 버튼 */}
      <button 
        onClick={handleBackClick}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        메인으로 돌아가기
      </button>
    </div>
  );
}

export default SubPage;
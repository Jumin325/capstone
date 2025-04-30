// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

// CORS 설정 - React 앱에서 API 호출 허용
app.use(cors());
app.use(express.json());

// MySQL 연결 설정
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'capstone'
});

// 연결 테스트
connection.connect(error => {
  if (error) {
    console.error('MySQL 연결 오류:', error);
    return;
  }
  console.log('MySQL 데이터베이스에 성공적으로 연결되었습니다.');
});

// 데이터 조회 API 엔드포인트 
// 이 API는 SubPage에서 호출할 예정입니다
app.get('/api/data', (req, res) => {
  // 원하는 테이블에서 데이터 조회
  const query = 'SELECT * FROM product';
  
  connection.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ 
        error: '데이터베이스 오류가 발생했습니다.',
        details: error.message 
      });
    }
    
    // 조회된 데이터를 JSON 형태로 반환
    res.json({
      success: true,
      data: results
    });
  });
});

// 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`서버 실행 중: 포트 ${PORT}`));
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

// 카테고리 조회 API 엔드포인트 - book 테이블의 category 값 조회
app.get('/api/categories', (req, res) => {
  const query = `
    SELECT DISTINCT category
    FROM book
  `;

  connection.query(query, (error, results) => {
    if (error) {
      console.error('카테고리 조회 오류:', error);
      return res.status(500).json({
        error: '데이터베이스 오류가 발생했습니다.',
        details: error.message
      });
    }

    // 단순 문자열 배열로 변환
    const categories = results.map(row => row.category);
    res.json(categories);
  });
});

// 데이터 조회 API 엔드포인트 - 책과 제품 테이블 조인
app.get('/api/data', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 9; // 한 페이지에 표시할 항목 수
  const offset = (page - 1) * limit;
  const category = req.query.category;
  const sort = req.query.sort || '최신순';

  // SQL WHERE 조건 구성
  let whereClause = 'p.is_active = TRUE';
  if (category && category !== 'all') {
    whereClause += ` AND b.category = ?`;
  }

  // SQL ORDER BY 구성
  let orderClause;
  switch (sort) {
    case '낮은가격순':
      orderClause = 'p.price ASC';
      break;
    case '높은가격순':
      orderClause = 'p.price DESC';
      break;
    default:
      orderClause = 'p.price ASC';
      break;
  }

  // 기본 쿼리 - 책 정보
  let query = `
    SELECT p.*, b.author, b.publisher, b.isbn, b.category, b.published_year
    FROM product p
    LEFT JOIN book b ON p.product_id = b.product_id
    WHERE ${whereClause}
    ORDER BY ${orderClause}
    LIMIT ? OFFSET ?
  `;

  // 파라미터 배열 구성
  let queryParams = [];
  if (category && category !== 'all') {
    queryParams.push(category);
  }
  queryParams.push(limit, offset);

  // 쿼리 실행
  connection.query(query, queryParams, (error, results) => {
    if (error) {
      console.error('데이터 조회 오류:', error);
      return res.status(500).json({
        error: '데이터베이스 오류가 발생했습니다.',
        details: error.message
      });
    }

    // 전체 상품 수를 조회하는 쿼리
    let countQuery = `
      SELECT COUNT(*) as total
      FROM product p
      LEFT JOIN book b ON p.product_id = b.product_id
      WHERE ${whereClause}
    `;

    // 카운트 쿼리 파라미터
    let countParams = [];
    if (category && category !== 'all') {
      countParams.push(category);
    }

    // 전체 상품 수 조회
    connection.query(countQuery, countParams, (countError, countResults) => {
      if (countError) {
        console.error('카운트 조회 오류:', countError);
        return res.status(500).json({
          error: '데이터베이스 오류가 발생했습니다.',
          details: countError.message
        });
      }

      const totalItems = countResults[0].total;
      const totalPages = Math.ceil(totalItems / limit);

      // 응답 데이터 구성
      res.json({
        success: true,
        data: results,
        pagination: {
          total: totalItems,
          per_page: limit,
          current_page: page,
          last_page: totalPages
        }
      });
    });
  });
});

// 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`서버 실행 중: 포트 ${PORT}`));
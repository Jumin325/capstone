const express = require('express');
const cors = require('cors');
const session = require('express-session');
const app = express();
const connection = require('./db');
// CORS 옵션 설정
const corsOptions = {
  origin: 'http://localhost:3000',  // React 앱의 도메인
  credentials: true,                // 쿠키를 포함하도록 허용
};

// CORS 미들웨어를 서버에 추가
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//비회원 세션 기능
app.use(session({
  secret: 'easyfind-secret-key',         // 세션 암호화에 사용되는 키
  resave: false,                     // 세션을 매 요청마다 저장할지 여부
  saveUninitialized: false,           // false로 변경하여 초기 세션 저장x
  cookie: { 
    maxAge: 1000 * 60 * 60, 
    secure: false,
    httpOnly: true,
    sameSite: 'strict' } // 1시간 유지 (필요에 따라 조절), 로컬 환경에서 secure : false로 설정해야 HTTPS가 아니여도 세션 저장
}));

// 세션 상태 확인 API (장바구니와 관계없이)
app.get('/api/session', (req, res) => {
  if (req.session) { // 세션이 존재하면
    res.send({ session: 'active' });  // 세션이 활성화된 상태
  } else {
    res.send({ session: 'inactive' }); // 세션이 없으면
  }
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

    // id, name 맵 형태로 저장
    const categories = results.map(row => ({
      id: row.category,
      name: row.category
    }));
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
  const productType = req.query.product_type || '책'; // 기본값은 '책'

  // SQL WHERE 조건 구성
  let whereClause = 'p.is_active = TRUE';
  if (productType === '책') {
    whereClause += ' AND p.product_type = "책"';
    if (category && category !== 'all') {
      whereClause += ' AND b.category = ?';
    }
  } else if (productType === '문구류') {
    whereClause += ' AND p.product_type = "문구류"';
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
  if (productType === '책' && category && category !== 'all') {
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
    if (productType === '책' && category && category !== 'all') {
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

//fetch 요청에 세션 쿠기 포함
fetch('http://localhost:5000/api/session', {
  method: 'GET',
  credentials: 'include',  // 세션 쿠키를 요청에 포함하도록 설정
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.log(error));

//장바구니 API
app.post('/api/cart', (req, res) => {
  const { product_id, quantity } = req.body;  // 프론트엔드에서 받은 상품 정보 (product_id, quantity 등)
  const sessionId = req.sessionID;
  
  //세션 초기화 (세션없으면 새로 생성됨)
  if (!req.session.initialized) {
    req.session.initialized = true;
    console.log('새 세션 생성됨:', req.sessionID);
  }

  // 현재 세션에 대한 '준비' 상태의 주문이 있는지 확인
  const checkOrderQuery = `
    SELECT order_id FROM orders 
    WHERE session_id = ? AND status = '준비'
    LIMIT 1
  `;

  connection.query(checkOrderQuery, [sessionId], (error, orderResults) => {
    if (error) {
      console.error('주문 확인 오류:', error);
      return res.status(500).json({ error: '주문을 확인하는데 실패했습니다.' });
    }

    let order_id;

    // 기존 주문이 없으면 새로운 주문 생성
    if (orderResults.length === 0) {
      const insertOrderQuery = `
        INSERT INTO orders (status, session_id)
        VALUES ('준비', ?)
      `;

      connection.query(insertOrderQuery, [sessionId], (error, newOrderResults) => {
        if (error) {
          console.error('주문 생성 오류:', error);
          return res.status(500).json({ error: '주문을 생성하는데 실패했습니다.' });
        }

        order_id = newOrderResults.insertId;
        addOrderItem(order_id);
      });
    } else {
      // 기존 주문이 있으면 해당 주문 ID 사용
      order_id = orderResults[0].order_id;
      addOrderItem(order_id);
    }

    // 주문 항목 추가 함수
    function addOrderItem(order_id) {
      // 상품 가격 조회
      const getProductQuery = `SELECT price FROM product WHERE product_id = ?`;
      
      connection.query(getProductQuery, [product_id], (error, productResults) => {
        if (error) {
          console.error('상품 정보 조회 오류:', error);
          return res.status(500).json({ error: '상품 정보를 조회하는데 실패했습니다.' });
        }

        const price_per_item = productResults[0] ? productResults[0].price : null;

        // 이미 같은 상품이 주문에 있는지 확인
        const checkExistingItemQuery = `
          SELECT order_item_id, quantity FROM order_items 
          WHERE order_id = ? AND product_id = ?
        `;

        connection.query(checkExistingItemQuery, [order_id, product_id], (error, itemResults) => {
          if (error) {
            console.error('상품 확인 오류:', error);
            return res.status(500).json({ error: '장바구니 상품을 확인하는데 실패했습니다.' });
          }

          if (itemResults.length > 0) {
            // 이미 존재하는 항목이면 수량 업데이트
            const existingItem = itemResults[0];
            const newQuantity = existingItem.quantity + quantity;
            
            const updateItemQuery = `
              UPDATE order_items 
              SET quantity = ? 
              WHERE order_item_id = ?
            `;

            connection.query(updateItemQuery, [newQuantity, existingItem.order_item_id], (error) => {
              if (error) {
                console.error('장바구니 업데이트 오류:', error);
                return res.status(500).json({ error: '장바구니를 업데이트하는데 실패했습니다.' });
              }

              res.status(200).json({ message: '장바구니에 상품 수량이 업데이트되었습니다.' });
            });
          } else {
            // 새 항목 추가
            const insertOrderItemQuery = `
              INSERT INTO order_items (order_id, product_id, quantity, price_per_item)
              VALUES (?, ?, ?, ?)
            `;

            connection.query(insertOrderItemQuery, [order_id, product_id, quantity, price_per_item], (error) => {
              if (error) {
                console.error('장바구니 아이템 추가 오류:', error);
                return res.status(500).json({ error: '장바구니에 아이템을 추가하는데 실패했습니다.' });
              }

              res.status(200).json({ message: '장바구니에 상품이 추가되었습니다.' });
            });
          }
        });
      });
    }
  });
});

// 장바구니 조회 API 엔드포인트
app.get('/api/cart', (req, res) => {
  const sessionId = req.sessionID;
  
  if (!sessionId) {
    return res.status(400).json({ error: '세션이 유효하지 않습니다.' });
  }

  // 1. 현재 세션의 '준비' 상태인 주문 조회
  const getOrderQuery = `
    SELECT order_id 
    FROM orders 
    WHERE session_id = ? AND status = '준비'
    LIMIT 1
  `;

  connection.query(getOrderQuery, [sessionId], (error, orderResults) => {
    if (error) {
      console.error('주문 조회 오류:', error);
      return res.status(500).json({ error: '장바구니를 조회하는데 실패했습니다.' });
    }

    // 장바구니가 없으면 빈 배열 반환
    if (orderResults.length === 0) {
      return res.json({ items: [] });
    }

    const orderId = orderResults[0].order_id;

    // 2. 주문에 해당하는 상품 정보 조회
    const getCartItemsQuery = `
      SELECT oi.order_item_id, oi.product_id, oi.quantity, oi.price_per_item,
             p.product_name, p.image_url, p.product_type,
             b.author, b.publisher
      FROM order_items oi
      JOIN product p ON oi.product_id = p.product_id
      LEFT JOIN book b ON p.product_id = b.product_id
      WHERE oi.order_id = ?
    `;

    connection.query(getCartItemsQuery, [orderId], (error, itemResults) => {
      if (error) {
        console.error('장바구니 아이템 조회 오류:', error);
        return res.status(500).json({ error: '장바구니 상품을 조회하는데 실패했습니다.' });
      }

      res.json({ items: itemResults });
    });
  });
});

// 장바구니 아이템 수량 변경 API
app.put('/api/cart/item/:id', (req, res) => {
  const orderItemId = req.params.id;
  const { quantity } = req.body;
  const sessionId = req.sessionID;

  if (!sessionId) {
    return res.status(400).json({ error: '세션이 유효하지 않습니다.' });
  }

  // 해당 아이템이 현재 세션 사용자의 장바구니에 있는지 확인
  const verifyItemQuery = `
    SELECT oi.order_item_id
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    WHERE oi.order_item_id = ? AND o.session_id = ? AND o.status = '준비'
  `;

  connection.query(verifyItemQuery, [orderItemId, sessionId], (error, results) => {
    if (error) {
      console.error('아이템 확인 오류:', error);
      return res.status(500).json({ error: '아이템을 확인하는데 실패했습니다.' });
    }

    if (results.length === 0) {
      return res.status(403).json({ error: '해당 상품을 수정할 권한이 없습니다.' });
    }

    // 수량 업데이트
    const updateQuantityQuery = `
      UPDATE order_items
      SET quantity = ?
      WHERE order_item_id = ?
    `;

    connection.query(updateQuantityQuery, [quantity, orderItemId], (error) => {
      if (error) {
        console.error('수량 업데이트 오류:', error);
        return res.status(500).json({ error: '수량을 업데이트하는데 실패했습니다.' });
      }

      res.json({ message: '수량이 업데이트되었습니다.' });
    });
  });
});

// 장바구니 아이템 삭제 API
app.delete('/api/cart/item/:id', (req, res) => {
  const orderItemId = req.params.id;
  const sessionId = req.sessionID;

  if (!sessionId) {
    return res.status(400).json({ error: '세션이 유효하지 않습니다.' });
  }

  // 해당 아이템이 현재 세션 사용자의 장바구니에 있는지 확인
  const verifyItemQuery = `
    SELECT oi.order_item_id
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    WHERE oi.order_item_id = ? AND o.session_id = ? AND o.status = '준비'
  `;

  connection.query(verifyItemQuery, [orderItemId, sessionId], (error, results) => {
    if (error) {
      console.error('아이템 확인 오류:', error);
      return res.status(500).json({ error: '아이템을 확인하는데 실패했습니다.' });
    }

    if (results.length === 0) {
      return res.status(403).json({ error: '해당 상품을 삭제할 권한이 없습니다.' });
    }

    // 아이템 삭제
    const deleteItemQuery = `
      DELETE FROM order_items
      WHERE order_item_id = ?
    `;

    connection.query(deleteItemQuery, [orderItemId], (error) => {
      if (error) {
        console.error('아이템 삭제 오류:', error);
        return res.status(500).json({ error: '아이템을 삭제하는데 실패했습니다.' });
      }

      res.json({ message: '상품이 장바구니에서 삭제되었습니다.' });
    });
  });
});

// 헤더 검색 기능
app.get('/api/search', (req, res) => {
  const searchQuery = req.query.query || '';
  const productType = req.query.product_type || '책'; // 기본은 책

  const query = `
    SELECT p.*, b.author, b.publisher, b.category
    FROM product p
    LEFT JOIN book b ON p.product_id = b.product_id
    WHERE p.product_name LIKE ? AND p.product_type = ?
  `;
  const params = [`%${searchQuery}%`, productType];

  connection.query(query, params, (err, results) => {
    if (err) {
      console.error('상품 검색 오류:', err);
      return res.status(500).json({ error: '상품 검색에 실패했습니다.' });
    }
    res.json({ data: results });
  });
});

// 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`서버 실행 중: 포트 ${PORT}`));
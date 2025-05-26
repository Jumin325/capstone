// server.js

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const initDB = require('./db');  // mysql2/promise 연결
const bcrypt = require('bcrypt');
const schedule = require('node-schedule');
const path = require('path');

const app = express();

// CORS 설정
const corsOptions = {
  origin: [
    'http://localhost:3000', // 개발용
    'http://capstone-easyfind-s3.s3-website.ap-northeast-2.amazonaws.com' // 운영용
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60,
    secure: false,
    httpOnly: true,
    sameSite: 'strict'
  }
}));

// 세션 확인
app.get('/api/session', (req, res) => {
  res.send({ session: req.session ? 'active' : 'inactive' });
});

// 카테고리 조회
app.get('/api/categories', async (req, res) => {
  try {
    const db = await initDB();
    const [results] = await db.query(`SELECT DISTINCT category FROM book`);
    const categories = results.map(row => ({ id: row.category, name: row.category }));
    res.json(categories);
    await db.end();
  } catch (err) {
    console.error('카테고리 조회 오류:', err);
    res.status(500).json({ error: 'DB 오류' });
  }
});
// 상품 데이터 조회
app.get('/api/data', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 9;
  const offset = (page - 1) * limit;

  const category = req.query.category || 'all';
  const sort = req.query.sort || '최신순';
  const productType = req.query.product_type || '책';
  const isAdmin = String(req.query.admin).toLowerCase() === 'true';

  let whereClause = '1=1';
  const params = [];

  // ✅ 비관리자라면 활성 상품만
  if (!isAdmin) {
    whereClause += ` AND p.is_active = 'true'`;
  }

  // ✅ 'lowstock'일 경우 - 재고만 필터하고 product_type/category 제한 없음
  if (category === 'lowstock') {
    whereClause += ` AND p.stock_quantity <= 5`;
  } else if (category === 'outofstock') {
    whereClause += ` AND p.stock_quantity = 0 AND p.is_active = 'false'`;
  } else {
    if (productType !== 'all') {
      whereClause += ` AND p.product_type = ?`;
      params.push(productType);
    }

    // ✅ 책일 때만 category 필터 적용
    if (productType === '책' && category && category !== 'all') {
      whereClause += ` AND b.category = ?`;
      params.push(category);
    }
  }

  // ✅ 정렬
  let orderClause = 'p.created_at DESC';
  if (sort === '낮은가격순') orderClause = 'p.price ASC';
  else if (sort === '높은가격순') orderClause = 'p.price DESC';

  try {
    const db = await initDB();

    const query = `
      SELECT p.*, b.author, b.publisher, b.category
      FROM product p
      LEFT JOIN book b ON p.product_id = b.product_id
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const [results] = await db.query(query, [...params, limit, offset]);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM product p
      LEFT JOIN book b ON p.product_id = b.product_id
      WHERE ${whereClause}
    `;
    const [countResults] = await db.query(countQuery, params);

    const totalItems = countResults[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: results,
      pagination: {
        total: countResults[0].total,
        per_page: limit,
        current_page: page,
        last_page: Math.ceil(countResults[0].total / limit),
      },
    });

    await db.end();
  } catch (error) {
    console.error('데이터 조회 오류:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 장바구니에 상품 추가
app.post('/api/cart', async (req, res) => {
  const { product_id, quantity } = req.body;
  const sessionId = req.sessionID;

  if (!req.session.initialized) {
    req.session.initialized = true;
    console.log('새 세션 생성됨:', sessionId);
  }

  try {
    const db = await initDB();

    // 준비 상태 주문 확인
    const [orderResults] = await db.query(
      `SELECT order_id FROM orders WHERE session_id = ? AND status = '준비' LIMIT 1`,
      [sessionId]
    );

    let order_id;
    if (orderResults.length === 0) {
      const [insertOrder] = await db.query(
        `INSERT INTO orders (status, session_id) VALUES ('준비', ?)`,
        [sessionId]
      );
      order_id = insertOrder.insertId;
    } else {
      order_id = orderResults[0].order_id;
    }

    // 상품 가격 조회
    const [productResults] = await db.query(
      `SELECT price FROM product WHERE product_id = ?`,
      [product_id]
    );
    const price_per_item = productResults[0]?.price;

    // 기존 아이템 확인
    const [itemResults] = await db.query(
      `SELECT order_item_id, quantity FROM order_items
       WHERE order_id = ? AND product_id = ?`,
      [order_id, product_id]
    );

    if (itemResults.length > 0) {
      const newQuantity = itemResults[0].quantity + quantity;
      await db.query(
        `UPDATE order_items SET quantity = ? WHERE order_item_id = ?`,
        [newQuantity, itemResults[0].order_item_id]
      );
      res.status(200).json({ message: '장바구니 수량 업데이트 완료' });
    } else {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_per_item)
         VALUES (?, ?, ?, ?)`,
        [order_id, product_id, quantity, price_per_item]
      );
      res.status(200).json({ message: '장바구니에 상품 추가됨' });
    }

    await db.end();
  } catch (err) {
    console.error('장바구니 추가 오류:', err);
    res.status(500).json({ error: '장바구니 추가 실패' });
  }
});

// 장바구니 조회
app.get('/api/cart', async (req, res) => {
  const sessionId = req.sessionID;

  if (!sessionId) {
    return res.status(400).json({ error: '세션이 유효하지 않습니다.' });
  }

  try {
    const db = await initDB();

    const [orderResults] = await db.query(
      `SELECT order_id FROM orders WHERE session_id = ? AND status = '준비' LIMIT 1`,
      [sessionId]
    );

    if (orderResults.length === 0) {
      await db.end();
      return res.json({ items: [], session_id: sessionId });
    }

    const orderId = orderResults[0].order_id;

    const [items] = await db.query(
      `SELECT oi.order_item_id, oi.product_id, oi.quantity, oi.price_per_item,
              p.product_name, p.image_url, p.product_type,
              b.author, b.publisher
       FROM order_items oi
       JOIN product p ON oi.product_id = p.product_id
       LEFT JOIN book b ON p.product_id = b.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.json({ items, session_id: sessionId });
    await db.end();
  } catch (err) {
    console.error('장바구니 조회 오류:', err);
    res.status(500).json({ error: '장바구니 정보를 불러오는 데 실패했습니다.' });
  }
});

// 결제 완료
app.post('/api/complete-order', async (req, res) => {
  const { sessionId } = req.body;

  try {
    const db = await initDB();

    const [orderRow] = await db.query(`
      SELECT order_id FROM orders
      WHERE session_id = ? AND status = '준비'
      LIMIT 1
    `, [sessionId]);

    if (!orderRow || orderRow.length === 0) {
      await db.end();
      return res.status(400).json({ success: false, error: '주문이 없습니다.' });
    }

    const orderId = orderRow[0].order_id;

    // ✅ 재고 확인 먼저
    const [items] = await db.query(`
      SELECT oi.product_id, oi.quantity, p.stock_quantity, p.product_name
      FROM order_items oi
      JOIN product p ON oi.product_id = p.product_id
      WHERE oi.order_id = ?
    `, [orderId]);

    for (const item of items) {
      if (item.quantity > item.stock_quantity) {
        await db.end();
        return res.status(400).json({
          success: false,
          error: `${item.product_name}의 재고가 부족합니다. 현재 재고: ${item.stock_quantity}개`
        });
      }
    }

    // ✅ 이 시점에만 주문 상태를 '완료'로 변경
    await db.query(`
      UPDATE orders
      SET status = '완료',
          order_date = CURRENT_TIMESTAMP
      WHERE order_id = ?`, [orderId]);

    // ✅ 재고 차감
    for (const item of items) {
      await db.query(`
        UPDATE product
        SET stock_quantity = stock_quantity - ?
        WHERE product_id = ?`,
        [item.quantity, item.product_id]
      );

      // ✅ stock_quantity 확인 후 is_active 업데이트
      await db.query(`
        UPDATE product
        SET is_active = CASE 
                          WHEN stock_quantity = 0 THEN 'false'
                          ELSE 'true'
                        END
        WHERE product_id = ?
      `, [item.product_id]);
    }

    const [sumResult] = await db.query(`
      SELECT SUM(quantity * price_per_item) AS total FROM order_items WHERE order_id = ?`,
      [orderId]
    );
    const totalAmount = sumResult[0].total || 0;

    await db.query(
      `UPDATE orders SET total_amount = ? WHERE order_id = ?`,
      [totalAmount, orderId]
    );

    await db.query(`
      INSERT INTO receipts (order_id, receipt_status, payment_date)
      VALUES (?, '대기', CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE receipt_status = '대기',
      payment_date = CURRENT_TIMESTAMP
    `, [orderId]);

    res.json({ success: true, orderId });
    await db.end();
  } catch (err) {
    console.error('주문 상태 업데이트 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});


// 수량 변경
app.put('/api/cart/item/:id', async (req, res) => {
  const orderItemId = req.params.id;
  const { quantity } = req.body;
  const sessionId = req.sessionID;

  if (!sessionId) {
    return res.status(400).json({ error: '세션이 유효하지 않습니다.' });
  }

  try {
    const db = await initDB();

    const [verify] = await db.query(
      `SELECT oi.order_item_id
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.order_id
       WHERE oi.order_item_id = ? AND o.session_id = ? AND o.status = '준비'`,
      [orderItemId, sessionId]
    );

    if (verify.length === 0) {
      await db.end();
      return res.status(403).json({ error: '해당 상품을 수정할 권한이 없습니다.' });
    }

    await db.query(
      `UPDATE order_items SET quantity = ? WHERE order_item_id = ?`,
      [quantity, orderItemId]
    );

    res.json({ message: '수량이 업데이트되었습니다.' });
    await db.end();
  } catch (err) {
    console.error('수량 업데이트 오류:', err);
    res.status(500).json({ error: '수량을 업데이트하는데 실패했습니다.' });
  }
});

// 아이템 삭제
app.delete('/api/cart/item/:id', async (req, res) => {
  const orderItemId = req.params.id;
  const sessionId = req.sessionID;

  if (!sessionId) {
    return res.status(400).json({ error: '세션이 유효하지 않습니다.' });
  }

  try {
    const db = await initDB();

    const [verify] = await db.query(
      `SELECT oi.order_item_id
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.order_id
       WHERE oi.order_item_id = ? AND o.session_id = ? AND o.status = '준비'`,
      [orderItemId, sessionId]
    );

    if (verify.length === 0) {
      await db.end();
      return res.status(403).json({ error: '해당 상품을 삭제할 권한이 없습니다.' });
    }

    await db.query(
      `DELETE FROM order_items WHERE order_item_id = ?`,
      [orderItemId]
    );

    res.json({ message: '상품이 장바구니에서 삭제되었습니다.' });
    await db.end();
  } catch (err) {
    console.error('삭제 오류:', err);
    res.status(500).json({ error: '아이템을 삭제하는데 실패했습니다.' });
  }
});

// 검색 API
app.get('/api/search', async (req, res) => {
  const searchQuery = req.query.query || '';
  const productType = req.query.product_type || '책';
  const category = req.query.category_id || '';
  const isAdmin = String(req.query.admin).toLowerCase() === 'true';

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;
  const offset = (page - 1) * limit;

  try {
    const db = await initDB();

    let whereClause = `p.product_name LIKE ? AND p.product_type = ?`;
    const params = [`%${searchQuery}%`, productType];

    if (!isAdmin) {
      whereClause += ` AND p.is_active = 'true'`;
    }

    if (category && category !== '전체' && category !== 'all') {
      whereClause += ` AND b.category = ?`;
      params.push(category);
    }

    // ✅ 1. 결과 데이터 조회 (LIMIT 적용)
    const dataQuery = `
      SELECT 
        p.product_id, p.product_name, p.price, p.image_url, p.product_type, p.stock_quantity, p.is_active,
        b.author, b.publisher, b.category
      FROM product p
      LEFT JOIN book b ON p.product_id = b.product_id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [results] = await db.query(dataQuery, [...params, limit, offset]);

    // ✅ 2. 총 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM product p
      LEFT JOIN book b ON p.product_id = b.product_id
      WHERE ${whereClause}
    `;
    const [countResults] = await db.query(countQuery, params);
    const totalItems = countResults[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // ✅ 3. 응답 반환
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

    await db.end();
  } catch (err) {
    console.error('🔴 검색 오류:', err);
    res.status(500).json({ error: '검색 실패', message: err.message });
  }
});

// 주문 상세 조회
app.get('/api/order-details/:orderId', async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const db = await initDB();

    const [results] = await db.query(
      `SELECT 
         o.order_id,
         o.order_date,
         oi.quantity,
         oi.price_per_item,
         p.product_name,
         b.author
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       JOIN product p ON oi.product_id = p.product_id
       LEFT JOIN book b ON p.product_id = b.product_id
       WHERE o.order_id = ?`,
      [orderId]
    );

    if (results.length === 0) {
      await db.end();
      return res.status(404).json({ error: '주문 내역 없음' });
    }

    const items = results.map(item => ({
      name: item.product_name,
      author: item.author,
      price: item.price_per_item,
      quantity: item.quantity
    }));

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    res.json({
      orderId: results[0].order_id,
      orderDate: results[0].order_date,
      totalAmount: total,
      items
    });

    await db.end();
  } catch (err) {
    console.error('주문 상세 오류:', err);
    res.status(500).json({ error: 'DB 오류' });
  }
});

// 전화번호 저장
app.post('/api/save-phone', async (req, res) => {
  const { sessionId, phone_tail } = req.body;

  if (!sessionId || !phone_tail) {
    return res.status(400).json({ success: false, error: '필수 정보 누락' });
  }

  try {
    const db = await initDB();

    const [orderRows] = await db.query(
      `SELECT order_id FROM orders
       WHERE session_id = ? AND status = '완료'
       ORDER BY order_id DESC LIMIT 1`,
      [sessionId]
    );

    if (!orderRows || orderRows.length === 0) {
      await db.end();
      return res.status(404).json({ success: false, error: '주문 없음' });
    }

    const orderId = orderRows[0].order_id;

    await db.query(
      `UPDATE orders SET phone = ? WHERE order_id = ?`,
      [phone_tail, orderId]
    );

    res.json({ success: true, orderId });
    await db.end();
  } catch (err) {
    console.error('전화번호 저장 오류:', err);
    res.status(500).json({ success: false, error: '전화번호 저장 실패' });
  }
});


// 예약내역 조회 - 전화번호 뒷자리로 조회
app.get('/api/reservation', async (req, res) => {
  const phoneTail = req.query.tail;

  try {
    const connection = await initDB();

    // ✅ 관리자일 경우 전체 조회
    if (phoneTail === 'admin') {
      const [adminOrders] = await connection.query(
        `SELECT o.order_id, o.order_date, o.total_amount, r.receipt_status, o.phone
         FROM orders o
         LEFT JOIN receipts r ON o.order_id = r.order_id
         WHERE o.status = '완료'
         ORDER BY o.order_date DESC`
      );

      const enrichedAdminOrders = await Promise.all(
        adminOrders.map(async (order) => {
          const [items] = await connection.query(
            `SELECT p.product_name
             FROM order_items oi
             JOIN product p ON oi.product_id = p.product_id
             WHERE oi.order_id = ?
             LIMIT 1`,
            [order.order_id]
          );

          const [summary] = await connection.query(
            `SELECT SUM(oi.quantity) as total_quantity
             FROM order_items oi
             WHERE oi.order_id = ?`,
            [order.order_id]
          );

          return {
            ...order,
            representative_product: items[0]?.product_name || '상품 없음',
            total_quantity: summary[0]?.total_quantity || 0
          };
        })
      );

      return res.json({ success: true, orders: enrichedAdminOrders });
    }

    // ✅ 일반 사용자 (전화번호 뒷자리로 조회)
    const [orders] = await connection.query(
      `SELECT o.order_id, o.order_date, o.total_amount, r.receipt_status, o.phone
       FROM orders o
       LEFT JOIN receipts r ON o.order_id = r.order_id
       WHERE o.phone LIKE ? AND o.status = '완료'
       ORDER BY o.order_date DESC`,
      [`%${phoneTail}`]
    );

    if (orders.length === 0) {
      return res.json({ success: false, message: '조회된 주문이 없습니다.' });
    }

    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const [items] = await connection.query(
          `SELECT p.product_name
           FROM order_items oi
           JOIN product p ON oi.product_id = p.product_id
           WHERE oi.order_id = ?
           LIMIT 1`,
          [order.order_id]
        );

        const [summary] = await connection.query(
          `SELECT SUM(oi.quantity) as total_quantity
           FROM order_items oi
           WHERE oi.order_id = ?`,
          [order.order_id]
        );

        return {
          ...order,
          representative_product: items[0]?.product_name || '상품 없음',
          total_quantity: summary[0]?.total_quantity || 0
        };
      })
    );

    res.json({ success: true, orders: enrichedOrders });
  } catch (err) {
    console.error('예약 내역 조회 실패:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ✅ 단일 주문 상세 조회 API
app.get('/api/reservation/:orderId', async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const db = await initDB();

    const [orderResult] = await db.query(`
      SELECT o.order_id, o.order_date, o.total_amount, o.phone,
             r.receipt_status, r.receipt_date
      FROM orders o
      LEFT JOIN receipts r ON o.order_id = r.order_id
      WHERE o.order_id = ?
    `, [orderId]);

    if (orderResult.length === 0) {
      return res.status(404).json({ success: false, message: '주문 없음' });
    }

    const [rep] = await db.query(`
      SELECT p.product_name
      FROM order_items oi
      JOIN product p ON oi.product_id = p.product_id
      WHERE oi.order_id = ?
      LIMIT 1
    `, [orderId]);

    const [summary] = await db.query(`
      SELECT SUM(quantity) as total_quantity
      FROM order_items
      WHERE order_id = ?
    `, [orderId]);

    const [items] = await db.query(`
      SELECT p.product_name AS name, b.author, oi.quantity, oi.price_per_item AS price
      FROM order_items oi
      JOIN product p ON oi.product_id = p.product_id
      LEFT JOIN book b ON p.product_id = b.product_id
      WHERE oi.order_id = ?
    `, [orderId]);

    res.json({
      success: true,
      order: {
        ...orderResult[0],
        representative_product: rep[0]?.product_name || '상품 없음',
        total_quantity: summary[0]?.total_quantity || 0,
        items: items
      }
    });

    await db.end();
  } catch (err) {
    console.error('🔴 주문 상세 조회 실패:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});


// ✅ 주문 상세 조회 API (server.js)
app.get('/api/order-details/:orderId', async (req, res) => {
  const orderId = req.params.orderId;
  const connection = await initDB();

  try {
    const [items] = await connection.query(`
      SELECT p.product_name, b.author, oi.price_per_item
      FROM order_items oi
      JOIN product p ON oi.product_id = p.product_id
      LEFT JOIN book b ON p.product_id = b.product_id
      WHERE oi.order_id = ?
    `, [orderId]);

    const [orderMeta] = await connection.query(`
      SELECT order_id, order_date
      FROM orders
      WHERE order_id = ?
    `, [orderId]);

    if (orderMeta.length === 0) {
      return res.status(404).json({ success: false });
    }

    // QR코드 생성 (base64 또는 URL)
    const qr = require('qrcode');
    const qrDataUrl = await qr.toDataURL(`http://localhost:3000/order-details/${orderId}`);

    const totalAmount = items.reduce((sum, i) => sum + i.price_per_item, 0);

    res.json({
      success: true,
      order_id: orderMeta[0].order_id,
      order_date: orderMeta[0].order_date,
      total_amount: totalAmount,
      items,
      qrUrl: qrDataUrl
    });
  } catch (err) {
    console.error('상세 조회 실패:', err);
    res.status(500).json({ success: false });
  }
});

// ✅ [유지] 주문 수령 상태 처리 (있으면 UPDATE, 없으면 INSERT)
app.post('/api/receipt/complete', async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, error: 'orderId가 필요합니다.' });
  }

  try {
    const db = await initDB();

    // receipt 존재 여부 확인
    const [check] = await db.query(
      `SELECT * FROM receipts WHERE order_id = ?`,
      [orderId]
    );

    if (check.length === 0) {
      // 없다면 새로 삽입
      await db.query(
        `INSERT INTO receipts (order_id, receipt_status, receipt_date)
         VALUES (?, '수령', CURRENT_TIMESTAMP)`,
        [orderId]
      );
    } else {
      // 있다면 상태만 업데이트
      await db.query(
        `UPDATE receipts
         SET receipt_status = '수령', receipt_date = CURRENT_TIMESTAMP
         WHERE order_id = ?`,
        [orderId]
      );
    }

    res.json({ success: true, message: '수령 완료 처리됨' });
    await db.end();
  } catch (err) {
    console.error('수령 상태 업데이트 오류:', err);
    res.status(500).json({ success: false, error: 'DB 오류' });
  }
});

// 질의응답 질문 등록하기
app.post('/api/questions', async (req, res) => {
  const { question, password } = req.body;
  if (!question || !password) {
    return res.status(400).json({ error: '질문과 비밀번호는 필수입니다.' });
  }

  try {
    const db = await initDB();
    const hashed = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO questions (question, passwd) VALUES (?, ?)',
      [question.trim(), hashed]
    );

    res.json({ insertId: result.insertId });
    await db.end();
  } catch (err) {
    console.error('질문 등록 오류:', err);
    res.status(500).json({ error: 'DB 오류' });
  }
});

// 질문 목록 불러오기
app.get('/api/questions', async (req, res) => {
  try {
    const db = await initDB();
    const [rows] = await db.query('SELECT question_id, question FROM questions ORDER BY question_id DESC');
    res.json(rows);
    await db.end();
  } catch (err) {
    console.error('질문 목록 조회 오류:', err);
    res.status(500).json({ error: 'DB 오류' });
  }
});

// 질문에 비밀번호 확인
app.post('/api/questions/verify', async (req, res) => {
  const { questionId, password } = req.body;

  if (!questionId || !password) {
    return res.status(400).json({ error: '질문 ID와 비밀번호가 필요합니다.' });
  }

  try {
    const db = await initDB();
    const [rows] = await db.query(
      'SELECT passwd, answer FROM questions WHERE question_id = ?',
      [questionId]
    );

    if (rows.length === 0) {
      await db.end();
      return res.status(404).json({ error: '질문이 존재하지 않습니다.' });
    }

    const match = await bcrypt.compare(password, rows[0].passwd);
    if (!match) {
      await db.end();
      return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
    }

    res.json({ answer: rows[0].answer || '아직 답변이 등록되지 않았습니다.' });
    await db.end();
  } catch (err) {
    console.error('답변 열람 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 내 질문 확인
app.post('/api/my-questions', async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: '비밀번호를 입력하세요' });
  }

  try {
    const db = await initDB();
    const [rows] = await db.query('SELECT question_id, question, answer, passwd FROM questions');

    const matchedQuestions = [];

    for (const row of rows) {
      const match = await bcrypt.compare(password, row.passwd);
      if (match) {
        matchedQuestions.push({
          question_id: row.question_id,
          question: row.question,
          answer: row.answer
        });
      }
    }

    await db.end();
    res.json({ questions: matchedQuestions });
  } catch (err) {
    console.error('내 문의 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 관리자 세션 실행 여부 확인
app.post('/api/admin-session', (req, res) => {
  const { action } = req.body;

  if (action === 'login') {
    req.session.regenerate((err) => {
      if (err) {
        console.error('세션 재생성 실패:', err);
        return res.status(500).json({ success: false });
      }

      req.session.admin = true;
      console.log('🔐 새 관리자 세션 생성됨');
      res.json({ success: true });
    });
  } else if (action === 'logout') {
    req.session.destroy((err) => {
      if (err) {
        console.error('세션 삭제 실패:', err);
        return res.status(500).json({ success: false });
      }
      console.log('🔓 관리자 세션 종료됨');
      res.json({ success: true });
    });
  }
});

//관리자 BookPage 재고 수정
app.put('/api/products/:productId', async (req, res) => {
  const { productId } = req.params;
  const { stock_quantity } = req.body;

  try {
    const db = await initDB();

    // 재고 수정
    await db.query(
      'UPDATE product SET stock_quantity = ? WHERE product_id = ?',
      [stock_quantity, productId]
    );

    // stock_quantity 확인 후 is_active 업데이트
    await db.query(`
      UPDATE product
      SET is_active = CASE 
                        WHEN stock_quantity = 0 THEN 'false'
                        ELSE 'true'
                      END
      WHERE product_id = ?
    `, [productId]);

    res.send({ success: true });
    await db.end(); // ✅ 연결 종료도 잊지 마세요
  } catch (err) {
    console.error('재고 수정 실패:', err);
    res.status(500).send({ success: false });
  }
});

// 장바구니 자동 삭제
// 테스트를 위해서 10초마다 검색, 3분 안에 결제하지 않으면 삭제
schedule.scheduleJob('*/10 * * * * *', async () => {
  try {
    const db = await initDB();

    // 1. 삭제 대상 order_id 조회
    const [rows] = await db.query(`
      SELECT order_id FROM orders
      WHERE status = '준비'
        AND order_date < (NOW() - INTERVAL 3 MINUTE)
    `);

    if (rows.length > 0) {
      const orderIds = rows.map(row => row.order_id);

      // 2. order_items 먼저 삭제
      const [deletedItems] = await db.query(
        `DELETE FROM order_items WHERE order_id IN (?)`,
        [orderIds]
      );

      // 3. orders 삭제
      const [deletedOrders] = await db.query(
        `DELETE FROM orders WHERE order_id IN (?)`,
        [orderIds]
      );

      console.log(`🗑️ order_items ${deletedItems.affectedRows}건 삭제됨`);
      console.log(`🗑️ orders ${deletedOrders.affectedRows}건 삭제됨`);
    }

    await db.end();
  } catch (err) {
    console.error('⛔ 대기 주문 자동 삭제 실패:', err);
  }
});

// 미수령으로 인한 주문 취소
// 테스트를 위해서 10초마다 검색, 1분 안에 수령하지 않으면 취소
schedule.scheduleJob('*/10 * * * * *', async () => {
  try {
    const db = await initDB();

    const [result] = await db.query(`
      UPDATE receipts
      SET receipt_status = '취소'
      WHERE receipt_status = '대기'
        AND payment_date < (NOW() - INTERVAL 1 MINUTE)
    `);

    if (result.affectedRows > 0) {
      console.log(`:arrows_counterclockwise: 장기간 미수령으로 취소된 데이터: ${result.affectedRows}건`);
    }

    await db.end();
  } catch (err) {
    console.error(':no_entry: 자동 수령 취소 실패:', err);
  }
});

app.get('/api/inquiries', async (req, res) => {
  const phoneTail = req.query.phoneTail;

  try {
    const db = await initDB(); // ✅ 이 줄이 빠져 있었음!!

    let results;
    if (phoneTail === 'admin') {
      [results] = await db.query('SELECT * FROM questions ORDER BY question_id DESC');
    } else {
      [results] = await db.query(
        'SELECT * FROM questions WHERE RIGHT(passwd, 4) = ? ORDER BY question_id DESC',
        [phoneTail]
      );
    }

    res.json(results);
    await db.end();
  } catch (err) {
    console.error('DB 조회 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
});

app.put('/api/questions/:id/answer', async (req, res) => {
  const { id } = req.params;
  const { answer } = req.body;

  try {
    const db = await initDB();

    await db.query(
      'UPDATE questions SET answer = ? WHERE question_id = ?',
      [answer, id]
    );

    res.json({ success: true });
    await db.end();
  } catch (err) {
    console.error('답변 저장 오류:', err);
    res.status(500).json({ message: '답변 저장 실패' });
  }
});

const fs = require('fs');

// ✅ React 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'build')));

// ✅ API보다 아래에 있어야 함! 모든 나머지 경로를 index.html로
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
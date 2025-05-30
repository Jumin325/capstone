import React, { useState, useEffect } from 'react';
import './M_BookPage.css';
import M_Header from './M_Header';
import axios from 'axios';

const M_BookPage = () => {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOrder, setSortOrder] = useState('최신순');
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const isAdmin = sessionStorage.getItem('admin') === 'true';
  const [editTarget, setEditTarget] = useState(null);
  const [newStock, setNewStock] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeProductType, setActiveProductType] = useState('all');

  useEffect(() => {
    if (!isSearching) fetchBooks();
    fetchCategories();
  }, [currentPage, sortOrder, isSearching, activeCategory, activeProductType]);

  useEffect(() => {
    if (isSearching) handleSearch();
  }, [currentPage]);

  useEffect(() => {
    if (keyword.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [keyword]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE}/api/data?page=${currentPage}&sort=${sortOrder}&category=${activeCategory}&product_type=${activeProductType}&admin=${isAdmin}`
      );
      const result = await response.json();
      setBooks(result.data);
      const totalCount = result.pagination?.total || 0;
      setTotalPages(Math.max(1, Math.ceil(totalCount / 9)));
    } catch (err) {
      console.error('도서 데이터 로딩 실패:', err);
      setError('서버와의 연결에 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/api/categories`);
      const data = await response.json();
      setCategories([{ id: 'all', name: '전체' }, ...data]);
    } catch (err) {
      console.error('카테고리 로딩 실패:', err);
    }
  };

  const handleSearch = async () => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const params = {
        query: trimmedKeyword,
        admin: isAdmin,
        page: currentPage,
        limit: 9,
      };

      // 필터링 조건이 all이 아닐 때만 파라미터 추가
      if (activeProductType !== 'all') params.product_type = activeProductType;
      if (activeCategory !== 'all') params.category_id = activeCategory;

      const response = await axios.get(`${process.env.REACT_APP_API_BASE}/api/search`, {
        params,
      });

      setSearchResults(response.data.data);
      const totalCount = response.data.pagination?.total || 0;
      setTotalPages(Math.max(1, Math.ceil(totalCount / 9)));
    } catch (error) {
      console.error('검색 실패:', error);
      setSearchResults([]);
    }
  };

  const handleAddToCart = async (product_id) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ product_id, quantity: 1 }),
      });
      const data = await response.json();
      alert(data.message);
    } catch (err) {
      console.error('장바구니 추가 실패:', err);
    }
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleStockUpdate = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/api/products/${editTarget.product_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: Number(newStock) }),
      });

      if (response.ok) {
        setBooks((prev) =>
          prev.map((b) =>
            b.product_id === editTarget.product_id
              ? { ...b, stock_quantity: Number(newStock) }
              : b
          )
        );
        alert('수정이 완료되었습니다.');
        setEditTarget(null);
      } else {
        alert('수정 실패');
      }
    } catch (err) {
      console.error('재고 수정 오류:', err);
      alert('서버 오류');
    }
  };

  return (
    <div className="m-book-container">
      <M_Header keyword={keyword} setKeyword={setKeyword} onSearch={handleSearch} />

      <div className="m-content-container">
        {/* 좌측 카테고리 사이드바 */}
        <div className="m-sidebar">
          <h3>도서</h3>
          <ul className="m-category-list">
            {categories.map((category) => (
              <li
                key={category.id}
                className={activeCategory === category.id ? 'active' : ''}
                onClick={() => {
                  setActiveProductType('책');
                  setActiveCategory(category.id);
                  setCurrentPage(1);
                  setIsSearching(false);
                }}
              >
                {category.name}
              </li>
            ))}
          </ul>

          <h3>문구류</h3>
          <ul className="m-category-list">
            <li
              className={activeProductType === '문구류' ? 'active' : ''}
              onClick={() => {
                setActiveProductType('문구류');
                setActiveCategory('all');
                setCurrentPage(1);
                setIsSearching(false);
              }}
            >
              문구류
            </li>
          </ul>
        </div>

        {/* 우측 콘텐츠 영역 */}
        <div className="m-main-content">
          <div className="m-sort-bar">
            <label>정렬:</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="낮은가격순">낮은가격순</option>
              <option value="높은가격순">높은가격순</option>
            </select>
          </div>

          <div className="m-book-grid">
            {loading ? (
              <div className="m-loading">로딩 중...</div>
            ) : error ? (
              <div className="m-error">{error}</div>
            ) : (isSearching ? searchResults : books).length === 0 ? (
              <div className="m-no-results">상품이 없습니다.</div>
            ) : (
              (isSearching ? searchResults : books).map((book) => (
                <div key={book.product_id} className="m-book-item">
                  <div className="m-book-image">
                    {book.image_url ? (
                      <img src={book.image_url} alt={book.product_name} />
                    ) : (
                      <div className="m-no-image">이미지 없음</div>
                    )}
                  </div>
                  <div className="m-book-info">
                    <h3>{book.product_name}</h3>
                    {book.product_type === '책' && (
                      <>
                        <p className="m-book-author">저자: {book.author}</p>
                        <p className="m-book-publisher">출판사: {book.publisher}</p>
                      </>
                    )}
                    <p className="m-book-price">{Number(book.price).toLocaleString()}원</p>
                    {isAdmin && <p>재고: {book.stock_quantity}</p>}
                    <div className="m-book-actions">
                      {isAdmin ? (
                        <button
                          onClick={() => {
                            setEditTarget(book);
                            setNewStock(book.stock_quantity.toString());
                          }}
                        >
                          수정
                        </button>
                      ) : (
                        <button onClick={() => handleAddToCart(book.product_id)}>장바구니</button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="m-pagination">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={currentPage === page ? 'active' : ''}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {editTarget && (
        <div className="m-modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="m-modal" onClick={(e) => e.stopPropagation()}>
            <h3>📦 재고 수정</h3>
            <p>{editTarget.product_name}</p>
            <input
              type="number"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              min="0"
            />
            <div className="m-modal-buttons">
              <button onClick={handleStockUpdate}>수정 완료</button>
              <button onClick={() => setEditTarget(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default M_BookPage;

import React, { useState, useEffect } from 'react';
import './SubPage.css';

const SubPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('최신순');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    fetchBooks();
  }, [currentPage, sortOrder, activeCategory]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      // 카테고리, 정렬, 페이지 파라미터 포함
      const response = await fetch(`http://localhost:5000/api/data?page=${currentPage}&sort=${sortOrder}&category=${activeCategory}`);
      if (!response.ok) {
        throw new Error('서버에서 데이터를 가져오는데 실패했습니다.');
      }
      const result = await response.json();
      setBooks(result.data);
      setError(null);
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다: ' + err.message);
      console.error('API 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: '전체' },
    { id: 'novel', name: '소설/문학' },
    { id: 'humanities', name: '인문/사회' },
    { id: 'business', name: '경제/경영' },
    { id: 'selfdev', name: '자기계발' },
    { id: 'science', name: '과학/기술' },
    { id: 'art', name: '예술/문화' },
    { id: 'other', name: '기타' }
  ];

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
    setCurrentPage(1); // 카테고리 변경 시 첫 페이지로 이동
  };

  return (
    <div className="bookstore-container">
      {/* 헤더 영역 */}
      <header className="header">
        <div className="header-title">EasyFind </div>
        <div className="search-box">
          <input type="text" placeholder="도서 검색..." className="search-input" />
          <button className="search-button">검색</button>
        </div>
      </header>

      {/* 네비게이션 메뉴 */}
      <nav className="nav-menu">
        <ul>
          <li>홈</li>
          <li>베스트셀러</li>
          <li>신간도서</li>
          <li>국내도서</li>
          <li>해외도서</li>
          <li>eBook</li>
          <li>오디오북</li>
        </ul>
      </nav>

      <div className="content-container">
        {/* 왼쪽 카테고리 사이드바 */}
        <div className="sidebar">
          <div className="category-section">
            <h3>카테고리</h3>
            <ul className="category-list">
              {categories.map((category) => (
                <li 
                  key={category.id} 
                  className={`category-item ${category.id === activeCategory ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(category.id)}
                >
                  {category.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 메인 컨텐츠 영역 */}
        <div className="main-content">
          {/* 정렬 옵션 */}
          <div className="sort-options">
            <span>정렬: </span>
            <select value={sortOrder} onChange={handleSortChange}>
              <option value="최신순">최신순</option>
              <option value="인기순">인기순</option>
              <option value="낮은가격순">낮은가격순</option>
              <option value="높은가격순">높은가격순</option>
            </select>
          </div>

          {/* 책 목록 */}
          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <div className="book-grid">
              {books.map((book) => (
                <div key={book.product_id} className="book-item">
                  <div className="book-image">
                    {book.image_url ? 
                      <img src={book.image_url} alt={book.product_name} /> : 
                      <div className="placeholder">책표지</div>
                    }
                  </div>
                  <div className="book-info">
                    <h3 className="book-title">{book.product_name}</h3>
                    {book.product_type === '책' && (
                      <>
                        <p className="book-author">저자: {book.author}</p>
                        <p className="book-publisher">출판사: {book.publisher}</p>
                      </>
                    )}
                    <div className="book-price">
                      <span className="sale-price">{Number(book.price).toLocaleString()}원</span>
                      {book.original_price && book.original_price > book.price && (
                        <span className="original-price">{Number(book.original_price).toLocaleString()}원</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          <div className="pagination">
            {Array.from({ length: 5 }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`page-button ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            <button 
              className="page-button next"
              onClick={() => handlePageChange(currentPage + 1)}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubPage;
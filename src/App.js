// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './components/MainPage';
import BookPage from './components/BookPage';
import CartPage from './components/CartPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/book" element={<BookPage />} />
          <Route path="/Cart" element={<CartPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
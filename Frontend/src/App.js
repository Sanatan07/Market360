import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { createTheme } from '@mui/material/styles';
import { AuthProvider, useAuth } from './context/AuthContext';

import Home from './components/homepage'; // Import Home component
import AuthPage from './components/AuthPage';
import ProductPage from './components/ProductPage';
import ProductDescription from './components/ProductDescription';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import UserProfile from './components/ProfilePage';
import Wishlist from './components/Wishlist';
import AdminPage from './components/AdminPage';

import './index.css';
import styles from './components/ProductPage.module.css';

// Layout component to conditionally render navbar and footer
const Layout = ({ children }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  return (
    <>
      {!isHomePage && <Navbar 
        handlePostDeal={() => {}} // We'll handle this via props
      />}
      <div className="app-container">
        {children}
      </div>
      {!isHomePage && <Footer />}
    </>
  );
};

const AppRoutes = () => {
  const [showProductModal, setShowProductModal] = useState(false);
  const { currentUser } = useAuth();

  const mode = useSelector((state) => state.global.mode);
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  const handlePostDeal = () => {
    setShowProductModal(true);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route
                  path="/products"
                  element={<ProductPage showModal={showProductModal} setShowModal={setShowProductModal} />}
                />
                <Route path="/products/:id" element={<ProductDescription currentUser={currentUser} />} />
                <Route path="/profile" element={<UserProfile currentUser={currentUser} />} />
                <Route path="/wishlist" element={<Wishlist currentUser={currentUser} />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
};

const App = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
);

export default App;

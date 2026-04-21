import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import SeoLandingPage from './components/SeoLandingPage';

import './index.css';
import './market360-theme.css';

// Layout component to conditionally render navbar and footer
const Layout = ({ children }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { currentUser } = useAuth();
  
  return (
    <>
      {!isHomePage && <Navbar 
        handlePostDeal={() => {}} // We'll handle this via props
        isAuthenticated={!!currentUser}
        currentUser={currentUser || {}}
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

  return (
    <Router>
      <Routes>
        {/* Home route without navbar and footer */}
        <Route path="/" element={<Home />} />
        
        {/* All other routes with navbar and footer */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/products" element={
                <ProductPage 
                  showModal={showProductModal} 
                  setShowModal={setShowProductModal} 
                />
              } />
              <Route path="/products/:id" element={
                <ProductDescription currentUser={currentUser} />
              } />
              <Route path="/profile" element={
                <UserProfile 
                  currentUser={currentUser} 
                  isAuthenticated={!!currentUser} 
                />
              } />
              <Route path="/wishlist" element={
                <Wishlist currentUser={currentUser} />
              } />
              <Route path="/deals/:category" element={<SeoLandingPage type="category-page" />} />
              <Route path="/store/:source" element={<SeoLandingPage type="store-page" />} />
              <Route path="/content/:slug" element={<SeoLandingPage type="content-page" />} />
              <Route path="/:page" element={<SeoLandingPage type="seo-page" />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;

// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { getMe, signOut, fetchCsrfToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setCurrentUser(JSON.parse(storedUser));

        const me = await getMe();
        setCurrentUser(me.user);
        localStorage.setItem('user', JSON.stringify(me.user));
        await fetchCsrfToken();
      } catch (e) {
        setCurrentUser(null);
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    await signOut();
    setCurrentUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

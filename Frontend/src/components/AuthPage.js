// components/AuthPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AuthPage.module.css';
import { signIn, signUp } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AuthPage = () => {
  const navigate = useNavigate();
  const [isSignIn, setIsSignIn] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
  
    try {
      if (isSignIn) {
        const response = await signIn(formData.email, formData.password);
        
        localStorage.setItem('token', response.token);
        login(response.user); 
        navigate('/products');
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        console.log('Signup data being sent:', {
          email: formData.email,
          password: formData.password,
          username: formData.username,
          confirmPassword: formData.confirmPassword
        });
        const response = await signUp(formData.email, formData.password, formData.username, formData.confirmPassword);
        console.log('Signup response:', response);
        localStorage.setItem('token', response.token);
        login(response.user); 
        navigate('/products');
      }
    } catch (error) {
      console.error('Full error object:', error);
      setError(error.response?.data?.message || 'An error occurred');
    }
  };
  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h2>{isSignIn ? 'Sign In' : 'Sign Up'}</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          {!isSignIn && (
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          {!isSignIn && (
            <div className={styles.formGroup}>
              <input
                type="password"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitButton}>
            {isSignIn ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className={styles.toggleText}>
          {isSignIn ? "Don't have an account? " : "Already have an account? "}
          <button
            className={styles.toggleButton}
            onClick={() => setIsSignIn(!isSignIn)}
          >
            {isSignIn ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
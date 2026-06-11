import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('token');
    console.log('[DEBUG - CLIENT] Initializing token from localStorage:', savedToken ? 'PRESENT' : 'MISSING');
    return savedToken;
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      console.log('[DEBUG - CLIENT] Initializing user from localStorage:', savedUser ? savedUser : 'NULL');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error('[DEBUG - CLIENT] Failed to parse initial user from localStorage:', e);
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Define logout first so it can be referenced in interceptors and other hooks
  const logout = useCallback(() => {
    console.log('[DEBUG - CLIENT] Logout action triggered. Clearing local state and localStorage.');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('username');
    setToken(null);
    setUser(null);
    console.log('[DEBUG - CLIENT] Logout complete.');
  }, []);

  // Login handler
  const login = useCallback((newToken, newUser) => {
    console.log('[DEBUG - CLIENT] Login action triggered.');
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('username', newUser.username);
    setToken(newToken);
    setUser(newUser);
  }, []);

  // Set up global Axios request interceptor to attach authorization token
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const currentToken = localStorage.getItem('token');
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
          console.log(`[DEBUG - CLIENT] Attaching token to request: ${config.method?.toUpperCase()} ${config.url}`);
        } else {
          console.log(`[DEBUG - CLIENT] Request without token: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Set up response interceptor to handle auto logout on 401
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // If the 401 failure was on a login/register request, do not trigger auto-logout
          const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
          if (!isAuthRoute) {
            console.warn('[DEBUG - CLIENT] Request failed with 401 Unauthorized. Auto logging out...');
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [logout]);

  // Validate token with backend on mount exactly ONCE (Issue 1, 2, 4, 7)
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUserStr = localStorage.getItem('user');

      if (!savedToken) {
        console.log('[DEBUG - CLIENT] No token found on app load. Setting user = null.');
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      // Optimistically restore token and user from localStorage immediately
      // to avoid screen flicker or sudden logout redirects.
      setToken(savedToken);
      if (savedUserStr) {
        try {
          setUser(JSON.parse(savedUserStr));
        } catch (e) {
          console.error('[DEBUG - CLIENT] Failed to parse optimistically restored user', e);
        }
      }

      console.log('[DEBUG - CLIENT] Validating token with backend...');
      try {
        const res = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` }
        });
        console.log('[DEBUG - CLIENT] Token validated successfully. User:', res.data.user);
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      } catch (err) {
        console.error('[DEBUG - CLIENT] Token validation failed:', err.message);
        // Only clear credentials if validation explicitly returns 401 or 403.
        // This keeps offline users logged in during temporary backend down times.
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          console.warn('[DEBUG - CLIENT] Invalid session token. Clearing credentials.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('username');
          setToken(null);
          setUser(null);
        } else {
          console.warn('[DEBUG - CLIENT] Network error. Preserving cached credentials.');
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { Components } from './components';
import axios from 'axios';
import { SpaceEditForm } from './comps/Spaces';

import { useSettings } from "./context/SettingsContext"

const {
  Header,
  Sidebar,
  Dashboard,
  Spaces,
  Profile,
  Calendar,
  Messages,
  Notifications,
  Settings,
  LoginPage,
  SpaceDetail,
  AdminPanel,
  SpacePostForm,
  UserProfile
} = Components;

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL + '/api';
axios.defaults.baseURL = API_BASE_URL;

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('yahh_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('yahh_token');
      localStorage.removeItem('yahh_user');
      // window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [lloading, setlLoading] = useState(true);
  const { error, loading } = useSettings();

// if (loading) return <LoadingSpinner />;
// if (error === 'unauthorized') return <LoginPage onLogin={login} />;


  useEffect(() => {
    const initializeApp = async () => {
      const token = localStorage.getItem('yahh_token');
      const savedUser = localStorage.getItem('yahh_user');

      if (token && savedUser) {
        try {
          const response = await axios.get('/auth/me');
          setCurrentUser(response.data.user);

          await loadNotifications();
          await loadMessages();
        } catch (error) {
          console.error('Auth verification failed:', error);
          localStorage.removeItem('yahh_token');
          localStorage.removeItem('yahh_user');
        }
      }
      setlLoading(false);
    };

    initializeApp();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await axios.get('/notifications?limit=10');
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('[MATDICH 3LIYA] Failed to load notifications:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get('/messages?limit=10');
      setMessages(response.data.conversations);
    } catch (error) {
      console.error('[MATDICH 3LIYA] Failed to load messages:', error);
    }
  };

  const login = async (userData, token) => {
    setCurrentUser(userData);
    localStorage.setItem('yahh_token', token);
    localStorage.setItem('yahh_user', JSON.stringify(userData));

    await loadNotifications();
    await loadMessages();
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }

    setCurrentUser(null);
    setNotifications([]);
    setMessages([]);
    localStorage.removeItem('yahh_token');
    localStorage.removeItem('yahh_user');
  };

  if (lloading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <span className="text-xl font-bold text-gray-900">lLoading...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <BrowserRouter>
        <div className="App">
          <LoginPage onLogin={login} />
        </div>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="App">
        <Header
          currentUser={currentUser}
          notifications={notifications}
          messages={messages}
          onLogout={logout}
          onNotificationUpdate={loadNotifications}
        />
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar currentUser={currentUser} />
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Dashboard currentUser={currentUser} />} />
              <Route path="/spaces" element={<Spaces currentUser={currentUser} />} />
              <Route path="/spaces/:id" element={<SpaceDetail currentUser={currentUser} />} />
              <Route path="/profile" element={<Profile currentUser={currentUser} />} />
              <Route path="/profile/:id" element={<Profile currentUser={currentUser} />} />
              <Route path="/calendar" element={<Calendar currentUser={currentUser} />} />
              <Route path="/messages" element={<Messages messages={messages} currentUser={currentUser} onMessageUpdate={loadMessages} />} />
              <Route path="/notifications" element={<Notifications notifications={notifications} currentUser={currentUser} onNotificationUpdate={loadNotifications} />} />
              <Route path="/settings" element={<Settings currentUser={currentUser} />} />
              {currentUser.is_admin && (
                <Route path="/admin" element={<AdminPanel currentUser={currentUser} />} />
              )}
              <Route path="/hashtags/:tag" element={<Spaces.HashtagSearch />} />
              <Route path="/spaces/:id/new-post" element={<SpacePostForm currentUser={currentUser} />} />
              <Route path="/spaces/:id/edit" element={<SpaceEditForm currentUser={currentUser} />} />
              <Route path="/settings" element={<Settings currentUser={currentUser} />} />
              <Route path="/profile" element={<SpaceEditForm currentUser={currentUser} />} />
              <Route path="/user/:id" element={<UserProfile currentUser={currentUser} />} />
              {/* UserProfile */}
              {/* <Route path="/spaces/:id/edit" element={<SpaceEditForm currentUser={currentUser} />} /> */}
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
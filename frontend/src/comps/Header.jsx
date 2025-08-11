import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Header = ({ currentUser, notifications, messages, onLogout, onNotificationUpdate }) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [showMessages, setShowMessages] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const unreadNotifications = notifications.filter(n => !n.is_read).length;
    const unreadMessages = messages.filter(m => m.unread_count > 0).length;

    const markNotificationAsRead = async (notificationId) => {
        try {
            await axios.put(`/notifications/${notificationId}/read`);
            if (onNotificationUpdate) {
                onNotificationUpdate();
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link to="/" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">H</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">yahh</span>
                    </Link>
                </div>

                <div className="flex-1 max-w-lg mx-8">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <button
                            onClick={(event) => {
                                setShowNotifications(!showNotifications)
                            }}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg relative"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadNotifications > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {unreadNotifications}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                <div className="p-4 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length > 0 ? (
                                        notifications.slice(0, 10).map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''}`}
                                                onClick={() => {
                                                    if (!notification.is_read) {
                                                        markNotificationAsRead(notification.id);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                                        <p className="text-sm text-gray-700 mt-1">{notification.content}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {new Date(notification.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-gray-500">
                                            No notifications yet
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowMessages(!showMessages)}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg relative"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {unreadMessages > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {unreadMessages}
                                </span>
                            )}
                        </button>

                        {showMessages && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                <div className="p-4 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {messages.length > 0 ? (
                                        messages.slice(0, 10).map((conversation) => (
                                            <div key={conversation.other_user_id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${conversation.unread_count > 0 ? 'bg-blue-50' : ''}`}>
                                                <div className="flex items-start space-x-3">
                                                    <img
                                                        src={conversation.other_user_avatar || '/default-avatar.png'}
                                                        alt={conversation.other_user_name}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-gray-900">{conversation.other_user_name}</p>
                                                        <p className="text-sm text-gray-700 mt-1 truncate">{conversation.last_message}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {new Date(conversation.last_message_time).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-gray-500">
                                            No conversations yet
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <img
                                src={`${process.env.REACT_APP_BACKEND_URL}${currentUser.avatar}` || '/default-avatar.png'}
                                alt={currentUser.name}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                            <span className="text-sm font-medium text-gray-900 hidden md:block">{currentUser.name}</span>
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                <div className="py-1">
                                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowUserMenu(false)}>
                                        Your Profile
                                    </Link>
                                    <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowUserMenu(false)}>
                                        Settings
                                    </Link>
                                    {currentUser.is_admin && (
                                        <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowUserMenu(false)}>
                                            Admin Panel
                                        </Link>
                                    )}
                                    <hr className="my-1" />
                                    <button
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            onLogout();
                                        }}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export { Header };
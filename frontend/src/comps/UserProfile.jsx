// src/components/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Post, PostImages } from "./Posts";

const UserProfile = ({ currentUser }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [posts, setPosts] = useState([]);
    const [spaces, setSpaces] = useState([]);
    const [activeTab, setActiveTab] = useState('posts');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`/users/profile/${id}`);
                setUser(response.data.user);

                // Fetch user's posts
                const postsRes = await axios.get(`/users/${response.data.user.id}/posts`);
                setPosts(postsRes.data.posts);

                // Fetch user's spaces
                const spacesRes = await axios.get(`/users/${response.data.user.id}/spaces`);
                setSpaces(spacesRes.data.spaces);
            } catch (err) {
                setError('Failed to load user profile');
                console.error('User profile error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [id]);

    const renderRoleBadge = () => {
        if (!user) return null;

        if (user.is_admin) {
            return (
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    Admin
                </span>
            );
        }

        if (user.is_moderator) {
            return (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                    Moderator
                </span>
            );
        }

        return (
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                Member
            </span>
        );
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="animate-pulse space-y-6">
                    <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
                        <div className="space-y-2">
                            <div className="h-6 bg-gray-200 rounded w-48"></div>
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                            <div className="h-4 bg-gray-200 rounded w-64"></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-8 bg-gray-200 rounded"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                    Return Home
                </button>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center">
                <div className="text-3xl font-bold text-gray-900 mb-4">User Not Found</div>
                <p className="text-gray-600 mb-6">
                    The user you're looking for doesn't exist or may have been removed.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                >
                    Return Home
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                    <img
                        src={`${process.env.REACT_APP_BACKEND_URL}${currentUser.avatar}` || '/default-avatar.png'}
                        alt={user.name}
                        className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                    />
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
                                <div className="text-xl text-gray-600 dark:text-gray-300">@{user.username}</div>
                            </div>
                            <div className="mt-4 md:mt-0">
                                {renderRoleBadge()}
                            </div>
                        </div>

                        {user.title && (
                            <div className="text-lg text-gray-800 dark:text-gray-200 mb-2">
                                {user.title}
                                {user.department && ` • ${user.department}`}
                            </div>
                        )}

                        {user.bio && (
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {user.bio}
                            </p>
                        )}

                        <div className="flex justify-center md:justify-start space-x-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{user.post_count || 0}</div>
                                <div className="text-gray-600 dark:text-gray-400">Posts</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{user.follower_count || 0}</div>
                                <div className="text-gray-600 dark:text-gray-400">Followers</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{user.following_count || 0}</div>
                                <div className="text-gray-600 dark:text-gray-400">Following</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex">
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`px-6 py-4 font-medium text-sm ${activeTab === 'posts'
                                ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            Posts
                        </button>
                        <button
                            onClick={() => setActiveTab('spaces')}
                            className={`px-6 py-4 font-medium text-sm ${activeTab === 'spaces'
                                ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            Spaces
                        </button>
                        <button
                            onClick={() => setActiveTab('about')}
                            className={`px-6 py-4 font-medium text-sm ${activeTab === 'about'
                                ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            About
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'posts' && (
                        <div className="space-y-6">
                            {posts.length > 0 ? (
                                posts.map((post) => (
                                    <Post key={post.id} post={post} currentUser={currentUser} />
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No posts yet</h3>
                                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first post.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'spaces' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {spaces.length > 0 ? (
                                spaces.map(space => (
                                    <Link
                                        key={space.id}
                                        to={`/spaces/${space.id}`}
                                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <div className="font-medium text-gray-900 dark:text-white mb-2">{space.name}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">{space.description}</div>
                                        <div className="mt-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <span className="mr-4">{space.member_count} members</span>
                                            <span>{space.post_count} posts</span>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-8">
                                    <div className="text-gray-500 dark:text-gray-400">
                                        Not a member of any spaces yet
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Details</h3>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Joined</div>
                                            <div className="text-gray-900 dark:text-white">
                                                {new Date(user.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
                                            <div className="text-gray-900 dark:text-white">{user.email}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                                            <div className="text-gray-900 dark:text-white capitalize">{user.status || 'offline'}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Last Active</div>
                                            <div className="text-gray-900 dark:text-white">
                                                {user.last_active_at ?
                                                    new Date(user.last_active_at).toLocaleTimeString() :
                                                    'Unknown'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {user.title && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Professional Information</h3>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {user.title && (
                                                <div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">Title</div>
                                                    <div className="text-gray-900 dark:text-white">{user.title}</div>
                                                </div>
                                            )}
                                            {user.department && (
                                                <div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">Department</div>
                                                    <div className="text-gray-900 dark:text-white">{user.department}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {user.bio && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Bio</h3>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="text-gray-900 dark:text-white">{user.bio}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
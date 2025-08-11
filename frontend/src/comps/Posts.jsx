import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function PostImages({ post }) {
    const [expandedImage, setExpandedImage] = useState(null);
    const images = post.image ? JSON.parse(post.image) : [];

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setExpandedImage(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    return (
        <>
            {images.length > 0 &&
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-6 pb-4">
                    {images.map((img, index) => (
                        <div key={index}>
                            <img
                                src={`${process.env.REACT_APP_BACKEND_URL}${img}`}
                                alt="Post content"
                                className="w-full h-40 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform duration-300"
                                onClick={() => setExpandedImage(`${process.env.REACT_APP_BACKEND_URL}${img}`)}
                            />
                        </div>
                    ))}
                </div>
            }

            {expandedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
                    <button
                        className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-red-500 transition-colors"
                        onClick={() => setExpandedImage(null)}
                    >
                        &times;
                    </button>
                    <img
                        src={expandedImage}
                        alt="Full"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            )}
        </>
    );
}

const Post = ({ post, currentUser, onPostUpdate }) => {
    const [liked, setLiked] = useState(post.user_liked || false);
    const [likeCount, setLikeCount] = useState(post.like_count || 0);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLike = async () => {
        try {
            const response = await axios.post(`/posts/${post.id}/like`);
            setLiked(response.data.liked);
            setLikeCount(prev => response.data.liked ? prev + 1 : prev - 1);
        } catch (error) {
            console.error('Failed to like post:', error);
        }
    };

    const loadComments = async () => {
        try {
            const response = await axios.get(`/posts/${post.id}/comments`);
            setComments(response.data.comments);
        } catch (error) {
            console.error('Failed to load comments:', error);
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setLoading(true);
        try {
            const response = await axios.post(`/posts/${post.id}/comments`, {
                content: newComment
            });
            setComments([...comments, response.data.comment]);
            setNewComment('');
        } catch (error) {
            console.error('Failed to add comment:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleComments = () => {
        setShowComments(!showComments);
        if (!showComments && comments.length === 0) {
            loadComments();
        }
    };

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="p-6 pb-4">
                <Link className="flex items-start space-x-3" to={`/user/${post.user_id}`}>
                    <img
                        src={`${process.env.REACT_APP_BACKEND_URL}${post.user_avatar}` || '/default-avatar.png'}
                        alt={post.user_name}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                        <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">{post.user_name}</h3>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">
                                {new Date(post.created_at).toLocaleString()}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600">{post.user_title}</p>
                    </div>
                </Link>
            </div>

            {/* Spaces section */}
            {post.spaces && post.spaces.length > 0 && (
                <div className="px-6 pb-3 flex flex-wrap gap-2">
                    {post.spaces.map((space, index) => (
                        <span
                            key={index}
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${space.color}20`, color: space.color }}
                        >
                            {space.name}
                        </span>
                    ))}
                </div>
            )}

            <div className="px-6 pb-4">
                <p className="text-gray-900 leading-relaxed whitespace-pre-line">{post.content}</p>
            </div>

            <PostImages post={post} />

            <div className="px-6 py-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={handleLike}
                            className={`flex items-center space-x-2 text-sm font-medium transition-colors ${liked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
                                }`}
                        >
                            <svg className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span>{likeCount}</span>
                        </button>

                        <button
                            onClick={toggleComments}
                            className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{post.comment_count || 0}</span>
                        </button>
                    </div>
                </div>
            </div>

            {showComments && (
                <div className="border-t border-gray-100">
                    <div className="px-6 py-4 space-y-4">
                        {comments.map((comment) => (
                            <div key={comment.id} className="flex items-start space-x-3">
                                <Link to={`/user/${comment.user_id}`}>
                                    <img
                                        src={`${process.env.REACT_APP_BACKEND_URL}${comment.user_avatar}` || '/default-avatar.png'}
                                        alt={comment.user_name}
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                    />
                                </Link>
                                <div className="flex-1">
                                    <div className="bg-gray-50 rounded-lg px-4 py-2">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="font-medium text-sm text-gray-900">{comment.user_name}</span>
                                            <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-700">{comment.content}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <form onSubmit={handleComment} className="flex items-start space-x-3">
                            <img
                                src={`${process.env.REACT_APP_BACKEND_URL}${currentUser.avatar}` || '/default-avatar.png'}
                                alt={currentUser.name}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                            <div className="flex-1 flex space-x-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !newComment.trim()}
                                    className="px-4 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 disabled:opacity-50 text-sm"
                                >
                                    {loading ? 'Posting...' : 'Post'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export { Post, PostImages };
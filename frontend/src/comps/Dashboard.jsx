import { useState, useEffect } from 'react';
import { Post, PostImages } from "./Posts";
import axios from 'axios';

const Dashboard = ({ currentUser }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [newPost, setNewPost] = useState('');
    const [posting, setPosting] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionQuery, setSuggestionQuery] = useState('');
    const [suggestionPosition, setSuggestionPosition] = useState(0);
    const [SpaceIDs, setSpaceIDs] = useState([]);

    const handleTextChange = (e) => {
        const value = e.target.value;
        setNewPost(value);

        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastWordMatch = textBeforeCursor.match(/#(\w+)$/); // last word that starts with #

        if (lastWordMatch) {
            const query = lastWordMatch[1]; // text after the #

            setSuggestionQuery(query);
            setSuggestionPosition(cursorPos - query.length - 1); // position of `#`

            if (query.length >= 1) {
                axios.get(`/posts/tags?query=${query}`)
                    .then(res => {
                        setHashtagSuggestions(res.data.tags || []);
                        setShowSuggestions(true);
                    });
            } else {
                setShowSuggestions(false);
            }
        } else {
            setShowSuggestions(false);
        }
    };

    const handleKeyDown = (e) => {
        if ((e.key === ' ' || e.key === 'Enter') && suggestionQuery) {
            if (!showSuggestions && suggestionQuery.length > 0) {
                axios.post('/posts/tags', { name: suggestionQuery })
                    .catch(err => {
                        console.error('Error creating tag:', err);
                    });

                setSuggestionQuery('');
            }
        }
    };

    const selectHashtag = (tag) => {
        const before = newPost.substring(0, suggestionPosition + 1);
        const after = newPost.substring(suggestionPosition + 1 + suggestionQuery.length);
        setNewPost(`${before}${tag.name} ${after}`);
        setSpaceIDs(prev => [...prev, tag.id])
        setShowSuggestions(false);
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            setUploading(true);

            const imagesWithPreviews = files.map(file => ({
                file,
                preview: URL.createObjectURL(file)
            }));

            setSelectedImages(prev => [...prev, ...imagesWithPreviews]);

            const formData = new FormData();
            files.forEach(file => formData.append('images', file));

            const response = await axios.post('/upload', formData, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            const data = await response.data;

            setSelectedImages(prev =>
                prev.map((img, i) => ({
                    ...img,
                    serverUrl: data.urls[i - (prev.length - imagesWithPreviews.length)]
                }))
            );
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Image upload failed');
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const removeImage = (index) => {
        setSelectedImages(prev => {
            const newImages = [...prev];
            newImages.splice(index, 1);
            return newImages;
        });
    };

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            const response = await axios.get('/posts?limit=10');
            response.data.posts = response.data.posts.map((post) => {
                try {
                    post.hashtags = JSON.parse(post.hashtags)
                } catch (e) {
                    post.hashtags = []
                }
                return post
            })
            setPosts(response.data.posts);
        } catch (error) {
            console.error('Failed to load posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPost.trim() && selectedImages.length === 0) return;

        try {
            setPosting(true);
            const response = await axios.post('/posts', JSON.stringify({
                content: newPost,
                images: selectedImages.map(img => img.serverUrl),
                space_ids: SpaceIDs
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            setPosts([response.data.post, ...posts]);
            setNewPost('');
            setShowCreatePost(false);
        } catch (error) {
            console.error('Failed to create post:', error);
        } finally {
            setPosting(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="animate-pulse space-y-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-lg shadow p-6">
                            <div className="flex space-x-3">
                                <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <button
                    onClick={() => setShowCreatePost(!showCreatePost)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                >
                    Create Post
                </button>
            </div>

            {showCreatePost && (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                    <form onSubmit={handleCreatePost}>
                        <div className="flex items-start space-x-3">
                            <img
                                src={`${process.env.REACT_APP_BACKEND_URL}${currentUser.avatar}` || '/default-avatar.png'}
                                alt={currentUser.name}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1">
                                <textarea
                                    placeholder="What's on your mind?"
                                    value={newPost}
                                    onChange={(e) => handleTextChange(e)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                                    rows="3"
                                    disabled={posting}
                                    onKeyDown={(e) => handleKeyDown(e)}
                                />

                                {showSuggestions && hashtagSuggestions.length > 0 && (
                                    <div className="absolute z-10 mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                                        {hashtagSuggestions.map((tag, index) => (
                                            <div
                                                key={index}
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => selectHashtag(tag)}
                                            >
                                                #{tag.name}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Image previews */}
                                {selectedImages.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {selectedImages.map((img, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={img.preview}
                                                    alt={`Preview ${index}`}
                                                    className="w-16 h-16 object-cover rounded border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex items-center space-x-4">
                                        <input
                                            type="file"
                                            id="image-upload"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={handleImageUpload}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => document.getElementById('image-upload').click()}
                                            className="flex items-center space-x-2 text-gray-600 hover:text-teal-600"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm">Photo</span>
                                        </button>
                                    </div>
                                    <div className="space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowCreatePost(false);
                                                setSelectedImages([]);
                                            }}
                                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={posting || (!newPost.trim() && selectedImages.length === 0)}
                                            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50"
                                        >
                                            {posting ? 'Posting...' : 'Post'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-6">
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <Post key={post.id} post={post} currentUser={currentUser} onPostUpdate={loadPosts} />
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
        </div>
    );
};

export { Dashboard }
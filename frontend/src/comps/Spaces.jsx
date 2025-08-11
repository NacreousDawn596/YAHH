import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Post, PostImages } from "./Posts";
import { Link } from 'react-router-dom';

const Spaces = ({ currentUser }) => {
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isPrivate: false,
        color: 'bg-blue-500'
    });
    const [errors, setErrors] = useState({});
    const [showJoinRequestModal, setShowJoinRequestModal] = useState(false);
    const [requestMessage, setRequestMessage] = useState(false);
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const navigate = useNavigate();

    const colorOptions = [
        'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500',
        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
        'bg-orange-500', 'bg-cyan-500'
    ];

    useEffect(() => {
        const loadSpaces = async () => {
            try {
                const response = await axios.get('/spaces?my_spaces=true');
                setSpaces(response.data.spaces);
            } catch (error) {
                console.error('Failed to load spaces:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSpaces();
    }, []);

    const handleSendJoinRequest = async () => {
        setIsSendingRequest(true);
        try {
            await axios.post(`/spaces/${space.id}/join-requests`, {
                message: requestMessage
            });
            setJoinRequestStatus('pending');
            setShowJoinRequestModal(false);
        } catch (error) {
            console.error('Failed to send join request:', error);
        } finally {
            setIsSendingRequest(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleColorSelect = (color) => {
        setFormData({ ...formData, color });
    };

    const handleCreateSpace = async (e) => {
        e.preventDefault();
        setErrors({});

        try {
            const response = await axios.post('/spaces', {
                name: formData.name,
                description: formData.description,
                is_private: formData.isPrivate,
                color: formData.color
            });

            setSpaces([response.data.space, ...spaces]);
            setShowCreateModal(false);
            setFormData({
                name: '',
                description: '',
                isPrivate: false,
                color: 'bg-blue-500'
            });
        } catch (error) {
            if (error.response && error.response.data && error.response.data.errors) {
                setErrors(error.response.data.errors);
            } else {
                console.error('Failed to create space:', error);
            }
        }
    };

    const handleJoinSpace = async (spaceId, isMember) => {
        try {
            await axios.post(`/spaces/${spaceId}/join`);
            const response = await axios.get('/spaces?my_spaces=true');
            setSpaces(response.data.spaces);
            navigate(`/spaces/${spaceId}`);
        } catch (error) {
            console.error('Error joining/leaving space:', error);
        }
    };

    const handleLeaveSpace = async (space) => {
        try {
            space.ja = undefined
            await axios.delete(`/spaces/user_spaces/${space.id}`);
            navigate('/spaces');
        } catch (error) {
            console.error('Failed to leave space:', error);
        }
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Spaces</h1>
                    <button
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                        onClick={() => setShowCreateModal(true)}
                    >
                        Create Space
                    </button>
                </div>
                <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                            <div className="h-32 bg-gray-200"></div>
                            <div className="p-4">
                                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Spaces</h1>
                <button
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                    onClick={(e) => setShowCreateModal(true)}
                >
                    Create Space
                </button>
            </div>

            {spaces.length === 0 ? (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
                    <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No spaces yet</h3>
                    <p className="mt-2 text-gray-500">
                        Get started by creating your first space to organize team communications.
                    </p>
                    <div className="mt-6">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                        >
                            Create Space
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {spaces.map(space => (
                        <div
                            key={space.id}
                            className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                            onClick={() => navigate(`/spaces/${space.id}`)}
                        >
                            <div className={`h-2 ${space.color || 'bg-blue-500'}`}></div>
                            <div className="p-5">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold text-lg text-gray-900">{space.name}</h3>
                                    {(space.is_private) ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            Private
                                        </span>
                                    ) : (
                                        <></>
                                    )}
                                </div>
                                <p className="mt-2 text-gray-600 line-clamp-2">{space.description || 'No description'}</p>

                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center text-sm text-gray-500">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{space.member_count} members</span>
                                    </div>

                                    {space.user_role === 'owner' ? (
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-lg">
                                            Owner
                                        </span>
                                    ) : (
                                        <>
                                            {!space.ja ? (
                                                <>
                                                    {space.is_private ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowJoinRequestModal(true);
                                                            }}
                                                            className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 text-sm"
                                                        >
                                                            Request Join
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleJoinSpace(space.id);
                                                            }}
                                                            className="px-3 py-1 bg-teal-100 text-teal-800 rounded-lg hover:bg-teal-200 text-sm"
                                                        >
                                                            Join
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleLeaveSpace(space);
                                                        }}
                                                        className="px-3 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm"
                                                    >
                                                        Leave
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                    {/* </div> */}

                                    {/* {space.user_role === 'owner' && (
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-lg">
                                            Owner
                                        </span>
                                    )} */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )
            }

            {
                showJoinRequestModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Request to Join Space</h3>
                                    <button
                                        onClick={() => setShowJoinRequestModal(false)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Message to Space Admins (optional)
                                        </label>
                                        <textarea
                                            value={requestMessage}
                                            onChange={(e) => setRequestMessage(e.target.value)}
                                            placeholder="Explain why you want to join this space..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                            rows={3}
                                            disabled={isSendingRequest}
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4 space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowJoinRequestModal(false)}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                            disabled={isSendingRequest}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSendJoinRequest}
                                            disabled={isSendingRequest}
                                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50"
                                        >
                                            {isSendingRequest ? 'Sending...' : 'Send Request'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create Space Modal */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Create New Space</h3>
                                    <button
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setErrors({});
                                        }}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <form onSubmit={handleCreateSpace}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Space Name *
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                                                placeholder="Marketing Team"
                                                required
                                            />
                                            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                placeholder="Describe the purpose of this space..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                                Color
                                            </label>
                                            <div className="grid grid-cols-5 gap-2">
                                                {colorOptions.map(color => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => handleColorSelect(color)}
                                                        className={`w-8 h-8 rounded-full ${color} ${formData.color === color ? 'ring-2 ring-offset-2 ring-teal-500' : ''}`}
                                                        aria-label={`Select ${color} color`}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="isPrivate"
                                                checked={formData.isPrivate}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                            />
                                            <label className="ml-2 block text-sm text-gray-700">
                                                Make this a private space
                                            </label>
                                        </div>

                                        <div className="flex justify-end pt-4 space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowCreateModal(false)}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                                            >
                                                Create Space
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

const SpaceDetail = ({ currentUser }) => {
    const { id } = useParams();
    const [space, setSpace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState([]);
    const [posts, setPosts] = useState([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const navigate = useNavigate();
    const [joinRequestStatus, setJoinRequestStatus] = useState(null); // 'pending', 'approved', 'rejected', null
    const [showJoinRequestModal, setShowJoinRequestModal] = useState(false);
    const [bannedMembers, setBannedMembers] = useState([]);
    const [showBanned, setShowBanned] = useState(false);
    const [processingUnban, setProcessingUnban] = useState(false);
    const [processingAction, setProcessingAction] = useState(false);


    useEffect(() => {
        const loadSpace = async () => {
            try {
                setLoading(true);
                const [spaceRes, membersRes] = await Promise.all([
                    axios.get(`/spaces/${id}`),
                    axios.get(`/spaces/${id}/members`)
                ]);

                setSpace(spaceRes.data.space);
                setMembers(membersRes.data.members);
                const postsRes = await axios.get(`/posts?space_id=${id}`);
                setPosts(postsRes.data.posts);
            } catch (error) {
                console.error('Failed to load space:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSpace();
    }, [id]);

    useEffect(() => {
        const checkJoinRequest = async () => {
            if (space && space.is_private && space.user_role === 'none') {
                try {
                    const response = await axios.get(`/spaces/${space.id}/join-requests/me`);
                    setJoinRequestStatus(response.data.status);
                } catch (error) {
                    console.error('Failed to check join request:', error);
                    setJoinRequestStatus(null);
                }
            }
        };

        checkJoinRequest();
    }, [space]);

    const handleSendJoinRequest = async () => {
        setIsSendingRequest(true);
        try {
            await axios.post(`/spaces/${space.id}/join-requests`, {
                message: requestMessage
            });
            setJoinRequestStatus('pending');
            setShowJoinRequestModal(false);
        } catch (error) {
            console.error('Failed to send join request:', error);
        } finally {
            setIsSendingRequest(false);
        }
    };

    const handleMemberAction = async (action, userId, isBanned = false) => {
        setProcessingAction(true);
        try {
            let response;
            switch (action) {
                case 'promote':
                    response = await axios.put(`/spaces/${id}/members/${userId}/promote`);
                    break;
                case 'kick':
                    response = await axios.delete(`/spaces/${id}/members/${userId}`);
                    break;
                case 'ban':
                    response = await axios.post(`/spaces/${id}/ban`, { user_id: userId });
                    break;
                case 'unban':
                    response = await axios.post(`/spaces/${id}/unban`, { user_id: userId });
                    break;
                default:
                    break;
            }

            // Refresh data after action
            if (action === 'ban' || action === 'unban') {
                const bannedRes = await axios.get(`/spaces/${id}/banned`);
                setBannedMembers(bannedRes.data.bans);
            } else {
                const membersRes = await axios.get(`/spaces/${id}/members`);
                setMembers(membersRes.data.members);
            }
        } catch (error) {
            console.error(`Failed to ${action} member:`, error);
        } finally {
            setProcessingAction(false);
        }
    };

    // Load banned members
    useEffect(() => {
        if (showBanned) {
            const loadBannedMembers = async () => {
                try {
                    const response = await axios.get(`/spaces/${id}/banned`);
                    setBannedMembers(response.data.bans);
                } catch (error) {
                    console.error('Failed to load banned members:', error);
                }
            };
            loadBannedMembers();
        }
    }, [showBanned, id]);

    useEffect(() => {
        const searchUsers = async () => {
            if (userSearch.trim().length < 2) {
                setSearchResults([]);
                return;
            }

            try {
                const response = await axios.get('/events/users/search', {
                    params: { query: userSearch }
                });
                setSearchResults(response.data.users);
            } catch (error) {
                console.error('User search failed:', error);
            }
        };

        const timer = setTimeout(searchUsers, 300);
        return () => clearTimeout(timer);
    }, [userSearch]);

    const handleInviteUser = async (userId) => {
        try {
            await axios.post(`/spaces/${id}/invite`, { user_id: userId });
            setShowInviteModal(false);
            setUserSearch('');

            const response = await axios.get(`/spaces/${id}/members`);
            setMembers(response.data.members);
        } catch (error) {
            console.error('Failed to invite user:', error);
        }
    };

    const handleLeaveSpace = async (spaceId) => {
        try {
            await axios.delete(`/spaces/user_spaces/${spaceId}`);
            navigate('/spaces');
        } catch (error) {
            console.error('Failed to leave space:', error);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="h-64 bg-gray-200 rounded-lg mb-6"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!space) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Space not found</h3>
                <p className="mt-1 text-sm text-gray-500">The space you requested doesn't exist or you don't have access.</p>
                <div className="mt-6">
                    <button
                        onClick={() => navigate('/spaces')}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                    >
                        Back to Spaces
                    </button>
                </div>
            </div>
        );
    }

    const userRole = space.user_role;
    const isOwner = userRole === 'owner';
    const isAdmin = isOwner || userRole === 'admin';

    return (
        <div className="max-w-4xl mx-auto">
            {/* Space Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">{space.name}</h1>
                    {isAdmin && (
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
                            >
                                Invite
                            </button>
                            <button
                                onClick={() => navigate(`/spaces/${id}/edit`)}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                            >
                                Edit
                            </button>
                        </div>
                    )}
                    {!isOwner && userRole !== 'none' && (
                        <button
                            onClick={() => handleLeaveSpace(space.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                        >
                            Leave Space
                        </button>
                    )}
                </div>

                {(space.is_private && space.user_role === 'none') ? (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <div>
                                <h3 className="font-medium text-blue-800">Private Space</h3>
                                <p className="text-sm text-blue-700 mt-1">
                                    This is a private space. You need to request access to view its content.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4">
                            {joinRequestStatus === 'pending' ? (
                                <div className="flex items-center text-sm text-gray-600">
                                    <svg className="w-5 h-5 text-yellow-500 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Your join request is pending approval</span>
                                </div>
                            ) : joinRequestStatus === 'approved' ? (
                                <div className="flex items-center text-sm text-green-600">
                                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Your join request has been approved!</span>
                                </div>
                            ) : joinRequestStatus === 'rejected' ? (
                                <div className="flex items-center text-sm text-red-600">
                                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Your join request was rejected</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowJoinRequestModal(true)}
                                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                                >
                                    Request to Join
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <></>
                )}

                {space.is_private ? (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 mb-4">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Private Space
                    </div>
                ) :
                    (
                        <></>
                    )}

                <p className="text-gray-600 mb-6">{space.description || 'No description provided.'}</p>

                <div className="flex items-center text-sm text-gray-500 mb-6">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{space.member_count} members • Created by {space.created_by_name}</span>
                </div>
            </div>

            {/* Space Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Posts</h2>
                        <button
                            onClick={() => navigate(`/spaces/${id}/new-post`)}
                            className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
                        >
                            New Post
                        </button>
                    </div>

                    {posts.length > 0 ? (
                        <div className="space-y-6">
                            {posts.map(post => (
                                <Post key={post.id} post={post} currentUser={currentUser} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">No posts yet</h3>
                            <p className="mt-2 text-gray-500">
                                Get started by creating the first post in this space.
                            </p>
                            <div className="mt-6">
                                <button
                                    onClick={() => navigate(`/spaces/${id}/new-post`)}
                                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                                >
                                    Create Post
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Members Panel */}
                <div>
                    <div className="bg-white rounded-lg shadow border border-gray-200 p-5 sticky top-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Members</h2>
                            <span className="text-sm text-gray-500">{members.length}</span>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {members.map(member => (
                                <div key={member.id} className="flex items-center justify-between group">
                                    <Link
                                        to={`/user/${member.id}`}
                                        className="flex items-center flex-1 min-w-0"
                                    >
                                        <img
                                            src={`${process.env.REACT_APP_BACKEND_URL}${member.avatar}` || '/default-avatar.png'}
                                            alt={member.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div className="ml-3 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{member.name}</p>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <span className="truncate">{member.title || 'No title'}</span>
                                                {member.role === 'owner' && (
                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        Owner
                                                    </span>
                                                )}
                                                {member.role === 'admin' && (
                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Admin
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Add member management dropdown */}

                                    {/* ... existing content ... */}

                                    {/* Updated member actions dropdown */}
                                    {isAdmin && member.role !== 'owner' && member.id !== currentUser.id && (
                                        <div className="relative">
                                            {/* ... existing dropdown button ... */}
                                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block hover:block">
                                                {/* ... existing options ... */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMemberAction('ban', member.id);
                                                    }}
                                                    className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                                    disabled={processingAction}
                                                >
                                                    Ban from Space
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {/* Add banned members panel */}
                            <div className="mt-6">
                                <button
                                    onClick={() => setShowBanned(!showBanned)}
                                    className="flex items-center text-sm text-red-600 hover:text-red-800"
                                >
                                    {showBanned ? 'Hide Banned Members' : 'View Banned Members'}
                                    <svg className={`w-4 h-4 ml-1 transition-transform ${showBanned ? 'rotate-180' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {showBanned && (
                                    <div className="mt-4 bg-red-50 rounded-lg border border-red-200 p-5">
                                        <h3 className="font-medium text-red-800 mb-4">Banned Members</h3>
                                        {bannedMembers.length > 0 ? (
                                            <div className="space-y-3">
                                                {bannedMembers.map(user => (
                                                    <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded border border-red-200">
                                                        <div className="flex items-center">
                                                            <img
                                                                src={`${process.env.REACT_APP_BACKEND_URL}${user.avatar}` || '/default-avatar.png'}
                                                                alt={user.name}
                                                                className="w-8 h-8 rounded-full mr-3"
                                                            />
                                                            <div>
                                                                <p className="font-medium text-gray-900">{user.name}</p>
                                                                <p className="text-xs text-gray-500">Banned on: {new Date(user.banned_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleMemberAction('unban', user.id, true)}
                                                            disabled={processingUnban}
                                                            className="px-3 py-1 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-sm font-medium disabled:opacity-50"
                                                        >
                                                            Unban
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 py-4 text-center">No banned members</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showJoinRequestModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Request to Join Space</h3>
                                <button
                                    onClick={() => setShowJoinRequestModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Message to Space Admins (optional)
                                    </label>
                                    <textarea
                                        value={requestMessage}
                                        onChange={(e) => setRequestMessage(e.target.value)}
                                        placeholder="Explain why you want to join this space..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        rows={3}
                                        disabled={isSendingRequest}
                                    />
                                </div>

                                <div className="flex justify-end pt-4 space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowJoinRequestModal(false)}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                        disabled={isSendingRequest}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendJoinRequest}
                                        disabled={isSendingRequest}
                                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50"
                                    >
                                        {isSendingRequest ? 'Sending...' : 'Send Request'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Invite to Space</h3>
                                <button
                                    onClick={() => {
                                        setShowInviteModal(false);
                                        setUserSearch('');
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Search Users
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            placeholder="Search by name or email"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                                    {searchResults.length > 0 ? (
                                        searchResults.map(user => {
                                            const isMember = members.some(m => m.id === user.id);
                                            return (
                                                <div
                                                    key={user.id}
                                                    className={`flex items-center px-4 py-3 hover:bg-gray-50 ${isMember ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                    onClick={() => !isMember && handleInviteUser(user.id)}
                                                >
                                                    <img
                                                        src={`${process.env.REACT_APP_BACKEND_URL}${user.avatar}` || '/default-avatar.png'}
                                                        alt={user.name}
                                                        className="w-10 h-10 rounded-full mr-3"
                                                    />
                                                    <div>
                                                        <p className="font-medium text-gray-900">{user.name}</p>
                                                        <p className="text-sm text-gray-500">{user.email}</p>
                                                    </div>
                                                    {isMember && (
                                                        <span className="ml-auto text-sm text-gray-500">Already a member</span>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="px-4 py-8 text-center">
                                            <p className="text-gray-500">
                                                {userSearch ? 'No users found' : 'Search for users to invite'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SpacePostForm = ({ currentUser }) => {
    const { id: spaceId } = useParams();
    const navigate = useNavigate();
    const [space, setSpace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newPost, setNewPost] = useState('');
    const [selectedImages, setSelectedImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionQuery, setSuggestionQuery] = useState('');
    const [suggestionPosition, setSuggestionPosition] = useState(0);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadSpace = async () => {
            try {
                const response = await axios.get(`/spaces/${spaceId}`);
                setSpace(response.data.space);
            } catch (error) {
                console.error('Failed to load space:', error);
                setError('Failed to load space details');
            } finally {
                setLoading(false);
            }
        };

        loadSpace();
    }, [spaceId]);

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
        setNewPost(`${before}${tag} ${after}`);
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
            setError('Image upload failed');
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

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPost.trim() && selectedImages.length === 0) return;

        try {
            setPosting(true);
            setError('');

            const response = await axios.post('/posts', {
                content: newPost,
                images: selectedImages.map(img => img.serverUrl),
                space_id: spaceId
            });

            navigate(`/spaces/${spaceId}`);
        } catch (error) {
            console.error('Failed to create post:', error);
            setError(error.response?.data?.message || 'Failed to create post');
        } finally {
            setPosting(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="h-12 bg-gray-200 rounded-lg mb-8"></div>
                    <div className="h-64 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (!space) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Space not found</h3>
                <p className="mt-1 text-sm text-gray-500">The space you requested doesn't exist or you don't have access.</p>
                <div className="mt-6">
                    <button
                        onClick={() => navigate('/spaces')}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                    >
                        Back to Spaces
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <button
                    onClick={() => navigate(`/spaces/${spaceId}`)}
                    className="flex items-center text-teal-600 hover:text-teal-800 mb-4"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to {space.name}
                </button>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Create Post in {space.name}</h1>
                        <div className="flex items-center mt-2">
                            <div className={`w-3 h-3 rounded-full ${space.color || 'bg-blue-500'} mr-2`}></div>
                            <span className="text-sm text-gray-600">
                                {space.is_private ? 'Private Space' : 'Public Space'} • {space.member_count} members
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <form onSubmit={handleCreatePost}>
                    <div className="flex items-start space-x-3">
                        <img
                            src={`${process.env.REACT_APP_BACKEND_URL}${currentUser.avatar}` || '/default-avatar.png'}
                            alt={currentUser.name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                            <div className="mb-2">
                                <span className="font-medium text-gray-900">{currentUser.name}</span>
                                <span className="text-sm text-gray-600 ml-2">{currentUser.title}</span>
                            </div>
                            <textarea
                                placeholder={`What's happening in ${space.name}?`}
                                value={newPost}
                                onChange={handleTextChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                                rows="4"
                                disabled={posting}
                                onKeyDown={handleKeyDown}
                            />

                            {showSuggestions && hashtagSuggestions.length > 0 && (
                                <div className="absolute z-10 mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                                    {hashtagSuggestions.map((tag, index) => (
                                        <div
                                            key={index}
                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                            onClick={() => selectHashtag(tag.name)}
                                        >
                                            #{tag.name}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Image previews */}
                            {selectedImages.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {selectedImages.map((img, index) => (
                                        <div key={index} className="relative">
                                            <img
                                                src={img.preview}
                                                alt={`Preview ${index}`}
                                                className="w-full h-32 object-cover rounded border"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
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
                                        disabled={uploading || posting}
                                    />
                                    <label
                                        htmlFor="image-upload"
                                        className={`flex items-center space-x-2 text-gray-600 hover:text-teal-600 cursor-pointer ${(uploading || posting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {uploading ? (
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                        <span className="text-sm">Photo</span>
                                    </label>
                                </div>
                                <div className="space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/spaces/${spaceId}`)}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                        disabled={posting}
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

            <div className="mt-8 bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex">
                    <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h3 className="font-medium text-blue-800">Posting to {space.name}</h3>
                        <p className="text-sm text-blue-700 mt-1">
                            All posts in this space will be visible to space members. {space.is_private
                                ? 'This is a private space - only invited members can see these posts.'
                                : 'This is a public space - anyone in the organization can see these posts.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SpaceEditForm = ({ currentUser }) => {
    const { id: spaceId } = useParams();
    const navigate = useNavigate();
    const [space, setSpace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isPrivate: false,
        color: 'bg-blue-500'
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const colorOptions = [
        'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500',
        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
        'bg-orange-500', 'bg-cyan-500'
    ];

    useEffect(() => {
        const loadSpace = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`/spaces/${spaceId}`);
                const spaceData = response.data.space;

                setSpace(spaceData);
                setFormData({
                    name: spaceData.name,
                    description: spaceData.description || '',
                    isPrivate: spaceData.is_private,
                    color: spaceData.color || 'bg-blue-500'
                });
            } catch (error) {
                console.error('Failed to load space:', error);
                setErrors({ general: 'Failed to load space details' });
            } finally {
                setLoading(false);
            }
        };

        loadSpace();
    }, [spaceId]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleColorSelect = (color) => {
        setFormData({ ...formData, color });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setSaving(true);

        try {
            await axios.put(`/spaces/${spaceId}`, {
                name: formData.name,
                description: formData.description,
                is_private: formData.isPrivate,
                color: formData.color
            });

            navigate(`/spaces/${spaceId}`);
        } catch (error) {
            if (error.response && error.response.data && error.response.data.errors) {
                setErrors(error.response.data.errors);
            } else {
                console.error('Failed to update space:', error);
                setErrors({ general: 'Failed to update space' });
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSpace = async () => {
        setDeleting(true);
        try {
            await axios.delete(`/spaces/${spaceId}`);
            navigate('/spaces');
        } catch (error) {
            console.error('Failed to delete space:', error);
            setErrors({ general: 'Failed to delete space' });
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="h-12 bg-gray-200 rounded-lg mb-8"></div>
                    <div className="grid grid-cols-5 gap-2 mb-6">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        ))}
                    </div>
                    <div className="h-64 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (!space) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Space not found</h3>
                <p className="mt-1 text-sm text-gray-500">The space you requested doesn't exist or you don't have access.</p>
                <div className="mt-6">
                    <button
                        onClick={() => navigate('/spaces')}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                    >
                        Back to Spaces
                    </button>
                </div>
            </div>
        );
    }

    if (space.user_role !== 'owner' && !currentUser.is_admin) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
                <p className="mt-1 text-sm text-gray-500">
                    You don't have permission to edit this space. Only space owners and administrators can make changes.
                </p>
                <div className="mt-6">
                    <button
                        onClick={() => navigate(`/spaces/${spaceId}`)}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                    >
                        Back to Space
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <button
                    onClick={() => navigate(`/spaces/${spaceId}`)}
                    className="flex items-center text-teal-600 hover:text-teal-800 mb-4"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to {space.name}
                </button>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Edit Space</h1>
                        <p className="text-gray-600 mt-2">Make changes to your space settings</p>
                    </div>
                </div>
            </div>

            {errors.general && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {errors.general}
                </div>
            )}

            <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-8">
                <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Space Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                                placeholder="Marketing Team"
                                required
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="Describe the purpose of this space..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Color
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {colorOptions.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => handleColorSelect(color)}
                                        className={`w-10 h-10 rounded-full ${color} ${formData.color === color ? 'ring-2 ring-offset-2 ring-teal-500' : ''}`}
                                        aria-label={`Select ${color} color`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="isPrivate"
                                checked={formData.isPrivate}
                                onChange={handleInputChange}
                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-700">
                                Make this a private space
                            </label>
                        </div>

                        <div className="flex justify-end pt-4 space-x-3">
                            <button
                                type="button"
                                onClick={() => navigate(`/spaces/${spaceId}`)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-200 rounded-lg">
                <div className="bg-red-50 px-6 py-4 border-b border-red-200">
                    <h2 className="text-lg font-medium text-red-800">Danger Zone</h2>
                </div>
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="mb-4 sm:mb-0">
                            <h3 className="font-medium text-gray-900">Delete this space</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Once you delete a space, there is no going back. All posts and data will be permanently removed.
                            </p>
                        </div>

                        {!deleteConfirm ? (
                            <button
                                onClick={() => setDeleteConfirm(true)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                            >
                                Delete Space
                            </button>
                        ) : (
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setDeleteConfirm(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteSpace}
                                    disabled={deleting}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                                >
                                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SpaceAdminPanel = ({ space, currentUser }) => {
    const [joinRequests, setJoinRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [showRequests, setShowRequests] = useState(false);

    useEffect(() => {
        if (showRequests) {
            const loadJoinRequests = async () => {
                setLoadingRequests(true);
                try {
                    const response = await axios.get(`/spaces/${space.id}/join-requests`);
                    setJoinRequests(response.data.requests);
                } catch (error) {
                    console.error('Failed to load join requests:', error);
                } finally {
                    setLoadingRequests(false);
                }
            };

            loadJoinRequests();
        }
    }, [showRequests, space.id]);

    const processRequest = async (requestId, action) => {
        try {
            await axios.put(`/spaces/${space.id}/join-requests/${requestId}`, { action });

            setJoinRequests(prev =>
                prev.map(req =>
                    req.id === requestId
                        ? { ...req, status: action === 'approve' ? 'approved' : 'rejected' }
                        : req
                )
            );
        } catch (error) {
            console.error(`Failed to ${action} request:`, error);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-5 mt-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
                <button
                    onClick={() => setShowRequests(!showRequests)}
                    className="flex items-center text-sm text-teal-600 hover:text-teal-800"
                >
                    {showRequests ? 'Hide Requests' : 'View Join Requests'}
                    <svg className={`w-4 h-4 ml-1 transition-transform ${showRequests ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {showRequests && (
                <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-medium text-gray-900 mb-3">Pending Join Requests</h3>

                    {loadingRequests ? (
                        <div className="flex justify-center py-4">
                            <svg className="w-6 h-6 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    ) : joinRequests.length > 0 ? (
                        <div className="space-y-4">
                            {joinRequests.map(request => (
                                <div key={request.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                    <Link className="flex items-start" to={`/user/${request.User.id}`}>
                                        <img
                                            src={`${process.env.REACT_APP_BACKEND_URL}${request.User.avatar}` || '/default-avatar.png'}
                                            alt={request.User.name}
                                            className="w-10 h-10 rounded-full mr-3"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900">{request.User.name}</p>
                                            <p className="text-sm text-gray-500">{request.User.title || 'No title'}</p>
                                        </div>
                                    </Link>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => processRequest(request.id, 'approve')}
                                            className="px-3 py-1 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-sm font-medium"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => processRequest(request.id, 'reject')}
                                            className="px-3 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm font-medium"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 py-4 text-center">No pending join requests</p>
                    )}
                </div>
            )
            }
        </div >
    );
};


export { Spaces, SpaceDetail, SpacePostForm, SpaceEditForm };
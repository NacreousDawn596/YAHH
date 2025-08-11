import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Messages = ({ currentUser }) => {
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const socketRef = useRef(null);
    const activeConversationRef = useRef(activeConversation);
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        activeConversationRef.current = activeConversation;
    }, [activeConversation]);

    const handleNewMessage = useCallback((newMessage) => {
        const currentActiveConv = activeConversationRef.current;

        if (newMessage.attachments && typeof newMessage.attachments === 'string') {
            newMessage.attachments = JSON.parse(newMessage.attachments);
        }

        if (currentActiveConv && currentActiveConv.id === newMessage.conversation_id) {
            setMessages(prev => [...prev, newMessage]);
        }

        setConversations(prev =>
            prev.map(conv =>
                conv.id === newMessage.conversation_id
                    ? {
                        ...conv,
                        last_message: newMessage.content || '[Attachment]',
                        last_message_time: newMessage.created_at,
                        unread_count: conv.id === currentActiveConv?.id ? 0 : conv.unread_count + 1
                    }
                    : conv
            )
        );
    }, []);

    useEffect(() => {
        socketRef.current = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3310', {
            transports: ['websocket', 'polling'],
        });

        const handleConnect = () => {
            socketRef.current.emit('join-user-room', currentUser.id);
        };

        const handleUpdateConversations = () => {
            loadConversations();
        };

        socketRef.current.on('connect_error', console.error);
        socketRef.current.on('connect', handleConnect);
        socketRef.current.on('new-message', handleNewMessage);
        socketRef.current.on('update-conversations', handleUpdateConversations);

        return () => {
            socketRef.current.off('connect_error');
            socketRef.current.off('connect', handleConnect);
            socketRef.current.off('new-message', handleNewMessage);
            socketRef.current.off('update-conversations', handleUpdateConversations);
            socketRef.current.disconnect();
        };
    }, [currentUser.id, handleNewMessage]);

    const colorPalette = [
        'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500',
        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
        'bg-orange-500', 'bg-cyan-500'
    ];

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            setUploading(true);

            const newAttachments = files.map(file => {
                const type = file.type.startsWith('image/') ? 'image' :
                    file.type.startsWith('video/') ? 'video' : 'file';

                return {
                    file,
                    name: file.name,
                    type,
                    previewUrl: type !== 'file' ? URL.createObjectURL(file) : null
                };
            });

            setAttachments(prev => [...prev, ...newAttachments]);

            const formData = new FormData();
            files.forEach(file => formData.append('files', file));

            const response = await axios.post('/messages/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const uploadedFiles = response.data.files;

            setAttachments(prev =>
                prev.map((att, i) => ({
                    ...att,
                    url: uploadedFiles[i - (prev.length - newAttachments.length)].url
                }))
            );
        } catch (error) {
            console.error('Upload failed:', error);
            alert('File upload failed');
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const removeAttachment = (index) => {
        setAttachments(prev => {
            const newAttachments = [...prev];
            newAttachments.splice(index, 1);
            return newAttachments;
        });
    };

    const getConversationIcon = (conversation) => {
        const colorIndex = conversation.id.split('').map(char => char.charCodeAt(0)).reduce((current, previous) => previous + current) % colorPalette.length;
        const color = colorPalette[colorIndex];

        let letters = '';
        if (conversation.is_group) {
            const groupNames = conversation.name.split(' and ').filter(name => name !== currentUser.name);
            if (groupNames.length > 0) {
                letters = groupNames.join('').substring(0, 2).toUpperCase();
            } else {
                letters = 'GR';
            }
        } else {
            const name = conversation.other_user_name || '';
            const words = name.trim().split(/\s+/);

            if (words.length >= 2) {
                letters = (words[0][0] + words[words.length - 1][0]).toUpperCase();
            } else if (name.length >= 2) {
                letters = name.substring(0, 2).toUpperCase();
            } else if (name.length === 1) {
                letters = name.charAt(0).toUpperCase();
            } else {
                letters = '??';
            }
        }

        return { color, letters };
    };

    const loadConversations = useCallback(async () => {
        try {
            const response = await axios.get('/messages/conversations');
            setConversations(response.data.conversations);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load conversations:', error);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    const loadMessages = useCallback(async () => {
        if (!activeConversation) return;

        try {
            const response = await axios.get(
                `/messages/conversations/${activeConversation.id}?sort=asc`
            );

            const parsedMessages = response.data.messages.map(msg => {
                if (msg.attachments && typeof msg.attachments === 'string') {
                    msg.attachments = JSON.parse(msg.attachments);
                }
                return msg;
            });

            setMessages(parsedMessages.reverse());

            await axios.post(`/messages/conversations/${activeConversation.id}/read`);

            setConversations(prev =>
                prev.map(conv =>
                    conv.id === activeConversation.id
                        ? { ...conv, unread_count: 0 }
                        : conv
                )
            );
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }, [activeConversation]);

    useEffect(() => {
        if (activeConversation) {
            loadMessages();
        }
    }, [activeConversation, loadMessages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && attachments.length === 0) return;

        try {
            const messageAttachments = attachments.map(att => ({
                url: att.url,
                name: att.name,
                type: att.type
            }));

            const response = await axios.post(
                `/messages/conversations/${activeConversation.id}/messages`,
                { content: newMessage, attachments: messageAttachments }
            );

            const newMsg = response.data;
            if (newMsg.attachments && typeof newMsg.attachments === 'string') {
                newMsg.attachments = JSON.parse(newMsg.attachments);
            }

            setMessages(prev => [...prev, newMsg]);
            setNewMessage('');
            setAttachments([]);

            setConversations(prev =>
                prev.map(conv =>
                    conv.id === activeConversation.id
                        ? {
                            ...conv,
                            last_message: newMessage || '[Attachment]',
                            last_message_time: new Date().toISOString(),
                            unread_count: 0
                        }
                        : conv
                )
            );
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    useEffect(() => {
        socketRef.current = io(process.env.REACT_APP_BACKEND_URL, {
            transports: ['websocket', 'polling'],
        });

        const handleConnect = () => {
            console.log('Connected to server');
            socketRef.current.emit('join-user-room', currentUser.id);
        };

        const handleUpdateConversations = () => {
            loadConversations();
        };

        socketRef.current.on('connect_error', console.error);
        socketRef.current.on('connect', handleConnect);
        socketRef.current.on('new-message', handleNewMessage);
        socketRef.current.on('update-conversations', handleUpdateConversations);

        return () => {
            socketRef.current.off('connect_error');
            socketRef.current.off('connect', handleConnect);
            socketRef.current.off('new-message', handleNewMessage);
            socketRef.current.off('update-conversations', handleUpdateConversations);
            socketRef.current.disconnect();
        };
    }, [currentUser.id, handleNewMessage]); // Only stable dependencies

    useEffect(() => {
        if (activeConversation) {
            loadMessages();
        }
    }, [activeConversation, loadMessages]);

    useEffect(() => {
        if (isCreatingGroup && selectedUsers.length > 0) {
            const names = selectedUsers.map(u => u.name);
            const placeholder = names.length > 0
                ? `${names.join(', ')} and me`
                : 'New Group Chat';

            if (!groupName) {
                setGroupName(placeholder);
            }
        }
    }, [selectedUsers, isCreatingGroup, groupName]);

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

    const startNewConversation = async (user) => {
        try {
            const existing = conversations.find(conv =>
                !conv.is_group &&
                conv.other_user_id === user.id
            );

            if (existing) {
                setActiveConversation(existing);
                setShowNewChatModal(false);
                return;
            }

            const response = await axios.post('/messages/conversations', {
                participant_ids: [user.id]
            });

            const newConv = response.data;
            try {
                newConv.name = JSON.parse(newConv.name).filter((i) => i != currentUser.name).join(" and ")
            } catch (e) {
                console.log(e)
            }
            setConversations(prev => [newConv, ...prev]);
            setActiveConversation(newConv);
            setShowNewChatModal(false);
        } catch (error) {
            console.error('Failed to start conversation:', error);
        }
    };

    const createGroupChat = async () => {
        if (selectedUsers.length < 2 || !groupName.trim()) return;

        try {
            const participantIds = selectedUsers.map(u => u.id);
            const response = await axios.post('/messages/conversations', {
                name: groupName,
                participant_ids: participantIds,
                is_group: true
            });

            const newConv = response.data;
            setConversations(prev => [newConv, ...prev]);
            setActiveConversation(newConv);
            setShowNewChatModal(false);
            setSelectedUsers([]);
            setGroupName('');
            setIsCreatingGroup(false);
        } catch (error) {
            console.error('Failed to create group chat:', error);
        }
    };

    const toggleUserSelection = (user) => {
        if (selectedUsers.some(u => u.id === user.id)) {
            setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const renderConversationList = () => {
        if (loading) {
            return (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="space-y-1">
                {conversations.map(conv => {
                    const icon = getConversationIcon(conv);

                    return (
                        <div
                            key={conv.id}
                            className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100 ${activeConversation?.id === conv.id ? 'bg-teal-50 border-l-4 border-teal-500' : ''}`}
                            onClick={() => setActiveConversation(conv)}
                        >
                            <div className="relative">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${icon.color}`}>
                                    {icon.letters}
                                </div>
                                {conv.unread_count > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {conv.unread_count}
                                    </span>
                                )}
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                    {conv.is_group ? conv.name : conv.other_user_name}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                    {conv.last_message || 'No messages yet'}
                                </p>
                            </div>
                            <div className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                {conv.last_message_time
                                    ? new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : ''}
                            </div>
                        </div>
                    );
                })}

                {conversations.length === 0 && !loading && (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No conversations yet</p>
                    </div>
                )}
            </div>
        );
    };

    const renderMessages = () => {
        if (!activeConversation) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="mt-4 text-gray-500">Select a conversation to start messaging</p>
                </div>
            );
        }

        const icon = getConversationIcon(activeConversation);

        return (
            <div className="flex flex-col h-full">
                {/* Conversation header */}
                <div className="border-b border-gray-200 p-4 flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${icon.color}`}>
                        {icon.letters}
                    </div>
                    <div className="ml-3">
                        <h2 className="font-semibold text-gray-900">
                            {activeConversation.name || 'Unknown User'}
                        </h2>
                        {!activeConversation.is_group && activeConversation.other_user_title && (
                            <p className="text-xs text-gray-500">{activeConversation.other_user_title}</p>
                        )}
                    </div>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse">
                    <div className="space-y-4">
                        {messages.length > 0 ? (
                            messages.map(message => {
                                const parsedAttachments = message.attachments &&
                                    typeof message.attachments === 'string'
                                    ? JSON.parse(message.attachments)
                                    : message.attachments || [];

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex flex-col ${message.sender_id === currentUser.id ? 'items-end' : 'items-start'} mb-2`}
                                    >
                                        {message.sender_id !== currentUser.id && (
                                            <span className="text-sm text-gray-600 font-semibold mb-1 ml-1">
                                                {message.author || 'Unknown'}
                                            </span>
                                        )}

                                        <div
                                            className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${message.sender_id === currentUser.id
                                                ? 'bg-teal-500 text-white rounded-br-none'
                                                : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                                }`}
                                        >
                                            {message.content && <p>{message.content}</p>}

                                            {parsedAttachments.length > 0 && (
                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                    {parsedAttachments.map(att => (
                                                        <div key={att.id} className="max-w-xs">
                                                            {att.type === 'image' ? (
                                                                <img
                                                                    src={`${process.env.REACT_APP_BACKEND_URL}${att.url}`}
                                                                    alt={att.name}
                                                                    className="w-full h-auto max-h-40 object-contain rounded-lg cursor-pointer"
                                                                    onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}${att.url}`, '_blank')}
                                                                />
                                                            ) : att.type === 'video' ? (
                                                                <video
                                                                    controls
                                                                    className="w-full h-auto max-h-40 rounded-lg"
                                                                >
                                                                    <source
                                                                        src={`${process.env.REACT_APP_BACKEND_URL}${att.url}`}
                                                                        type={`video/${att.url.split('.').pop()}`}
                                                                    />
                                                                </video>
                                                            ) : att.type ? (
                                                                <a
                                                                    href={`${process.env.REACT_APP_BACKEND_URL}${att.url}`}
                                                                    download={att.name}
                                                                    className="flex items-center p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                                                                >
                                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                    <span className="text-sm truncate">{att.name}</span>
                                                                </a>
                                                            ) : (
                                                                <></>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <p
                                                className={`text-xs mt-1 ${message.sender_id === currentUser.id ? 'text-teal-100' : 'text-gray-500'}`}
                                            >
                                                {new Date(message.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No messages yet. Start the conversation!</p>
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4">
                    {attachments.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                            {attachments.map((att, index) => (
                                <div key={index} className="relative">
                                    {att.type === 'image' ? (
                                        <img
                                            src={att.previewUrl}
                                            alt="Preview"
                                            className="w-16 h-16 object-cover rounded border"
                                        />
                                    ) : att.type === 'video' ? (
                                        <video className="w-16 h-16 object-cover rounded border" muted>
                                            <source src={att.previewUrl} type={att.file?.type} />
                                        </video>
                                    ) : (
                                        <div className="flex items-center p-2 bg-gray-100 rounded border max-w-xs">
                                            <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="text-xs truncate">{att.name}</span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeAttachment(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            disabled={uploading}
                        />

                        {/* File upload button */}
                        <input
                            type="file"
                            id="file-upload"
                            multiple
                            accept="image/*,video/*,application/*"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <label
                            htmlFor="file-upload"
                            className="ml-2 p-2 text-gray-500 hover:text-teal-600 cursor-pointer disabled:opacity-50"
                        >
                            {uploading ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            )}
                        </label>

                        <button
                            type="submit"
                            disabled={(!newMessage.trim() && attachments.length === 0) || uploading}
                            className="ml-2 p-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-150px)]" >
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>

                <div className="flex gap-3">
                    {/* New Chat Button */}
                    <button
                        onClick={() => { setIsCreatingGroup(false); setShowNewChatModal(true) }}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all font-medium flex items-center gap-2 shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>New Chat</span>
                    </button>

                    {/* New Group Button */}
                    <button
                        onClick={() => { setIsCreatingGroup(true); setShowNewChatModal(true) }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all font-medium flex items-center gap-2 shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m6-2a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>New Group</span>
                    </button>
                </div>
            </div>


            <div className="bg-white rounded-lg shadow border border-gray-200 h-full flex">
                {/* Conversation list */}
                <div className="w-1/3 border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200">
                        <h2 className="font-semibold text-gray-900">Conversations</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {renderConversationList()}
                    </div>
                </div>

                {/* Messages area */}
                <div className="w-2/3 flex flex-col">
                    {renderMessages()}
                </div>
            </div>

            {/* New Chat Modal */}
            {showNewChatModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {isCreatingGroup ? 'Create Group Chat' : 'New Message'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowNewChatModal(false);
                                        setUserSearch('');
                                        setSearchResults([]);
                                        setSelectedUsers([]);
                                        setIsCreatingGroup(false);
                                        setGroupName('');
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {isCreatingGroup ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Group Name
                                        </label>
                                        <input
                                            type="text"
                                            value={groupName}
                                            onChange={(e) => setGroupName(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                            placeholder="Enter group name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Add Participants
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={userSearch}
                                                onChange={(e) => setUserSearch(e.target.value)}
                                                placeholder="Search users..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                            />

                                            {searchResults.length > 0 && (
                                                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                                                    {searchResults.map(user => (
                                                        <div
                                                            key={user.id}
                                                            className={`flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer ${selectedUsers.some(u => u.id === user.id) ? 'bg-blue-50' : ''}`}
                                                            onClick={() => { toggleUserSelection(user); setSearchResults(searchResults.filter((u) => u != user)) }}
                                                        >
                                                            <img
                                                                src={`${process.env.REACT_APP_BACKEND_URL}${user.avatar}` || '/default-avatar.png'}
                                                                alt={user.name}
                                                                className="w-8 h-8 rounded-full mr-3"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                                                <p className="text-xs text-gray-500">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {selectedUsers.map(user => (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center bg-teal-100 text-teal-800 rounded-full px-3 py-1 text-sm"
                                                >
                                                    <span>{user.name}</span>
                                                    <button
                                                        onClick={() => { toggleUserSelection(user); setSearchResults([...searchResults, user]) }}
                                                        className="ml-2 text-teal-800 hover:text-teal-900"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4 space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingGroup(false)}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={createGroupChat}
                                            disabled={selectedUsers.length < 2 || !groupName.trim()}
                                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50"
                                        >
                                            Create Group
                                        </button>
                                    </div>
                                </div>
                            ) : (
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

                                            {searchResults.length > 0 && (
                                                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                                                    {searchResults.map(user => (
                                                        <div
                                                            key={user.id}
                                                            className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                            onClick={() => startNewConversation(user)}
                                                        >
                                                            <img
                                                                src={`${process.env.REACT_APP_BACKEND_URL}${user.avatar}` || '/default-avatar.png'}
                                                                alt={user.name}
                                                                className="w-8 h-8 rounded-full mr-3"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                                                <p className="text-xs text-gray-500">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-center pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingGroup(true)}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center space-x-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span>Create Group Chat</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

export { Messages }
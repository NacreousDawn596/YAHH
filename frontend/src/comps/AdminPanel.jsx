// src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const AdminPanel = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [posts, setPosts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState([]);
  const [userSettings, setUserSettings] = useState([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [newConfig, setNewConfig] = useState({ key: '', value: '' });
  const [broadcast, setBroadcast] = useState({ title: '', content: '', type: 'announcement' });

  // Fetch data based on active tab
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = {
          limit: pagination.limit,
          offset: (pagination.page - 1) * pagination.limit,
          search
        };

        switch(activeTab) {
          case 'dashboard':
            const statsRes = await axios.get('/admin/stats');
            setStats(statsRes.data.stats);
            break;
            
          case 'users':
            const usersRes = await axios.get('/admin/users', { params });
            setUsers(usersRes.data.users);
            setPagination(prev => ({ ...prev, total: usersRes.data.total || usersRes.data.users.length }));
            break;
            
          case 'spaces':
            const spacesRes = await axios.get('/admin/spaces', { params });
            setSpaces(spacesRes.data.spaces);
            setPagination(prev => ({ ...prev, total: spacesRes.data.total || spacesRes.data.spaces.length }));
            break;
            
          case 'posts':
            const postsRes = await axios.get('/admin/posts', { params });
            setPosts(postsRes.data.posts);
            setPagination(prev => ({ ...prev, total: postsRes.data.total || postsRes.data.posts.length }));
            break;
            
          case 'messages':
            const messagesRes = await axios.get('/admin/messages', { params });
            setMessages(messagesRes.data.messages);
            setPagination(prev => ({ ...prev, total: messagesRes.data.total || messagesRes.data.messages.length }));
            break;
            
          case 'logs':
            const logsRes = await axios.get('/admin/logs', { params });
            setLogs(logsRes.data.logs);
            setPagination(prev => ({ ...prev, total: logsRes.data.total || logsRes.data.logs.length }));
            break;
            
          case 'config':
            const configRes = await axios.get('/admin/config');
            setConfig(configRes.data.config);
            break;
            
          case 'user-settings':
            const settingsRes = await axios.get('/admin/user-settings');
            setUserSettings(settingsRes.data.settings);
            break;
            
          default:
            break;
        }
      } catch (error) {
        console.error('Admin data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, pagination.page, search]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleBanUser = async (userId) => {
    if (window.confirm('Are you sure you want to ban this user?')) {
      try {
        await axios.post(`/admin/users/${userId}/ban`, { reason: 'Admin action', duration: 30 });
        fetchData();
      } catch (error) {
        console.error('Ban user error:', error);
      }
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await axios.post(`/admin/users/${userId}/unban`);
      fetchData();
    } catch (error) {
      console.error('Unban user error:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Permanently delete this user and all their content?')) {
      try {
        await axios.delete(`/admin/users/${userId}`, { params: { permanent: true } });
        fetchData();
      } catch (error) {
        console.error('Delete user error:', error);
      }
    }
  };

  const handleDeleteSpace = async (spaceId) => {
    if (window.confirm('Permanently delete this space and all its content?')) {
      try {
        await axios.delete(`/admin/spaces/${spaceId}`);
        fetchData();
      } catch (error) {
        console.error('Delete space error:', error);
      }
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('Permanently delete this post and all its comments?')) {
      try {
        await axios.delete(`/admin/posts/${postId}`);
        fetchData();
      } catch (error) {
        console.error('Delete post error:', error);
      }
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Permanently delete this message?')) {
      try {
        await axios.delete(`/admin/messages/${messageId}`);
        fetchData();
      } catch (error) {
        console.error('Delete message error:', error);
      }
    }
  };

  const handleAddConfig = async () => {
    if (!newConfig.key || !newConfig.value) {
      alert('Both key and value are required');
      return;
    }
    
    try {
      await axios.put('/admin/config', newConfig);
      setNewConfig({ key: '', value: '' });
      fetchData();
    } catch (error) {
      console.error('Add config error:', error);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcast.title || !broadcast.content) {
      alert('Title and content are required');
      return;
    }
    
    try {
      await axios.post('/admin/broadcast', broadcast);
      setBroadcast({ title: '', content: '', type: 'announcement' });
      alert('Broadcast sent successfully!');
    } catch (error) {
      console.error('Broadcast error:', error);
    }
  };

  const handleUpdateUserSettings = async (userId, settings) => {
    try {
      await axios.put(`/admin/user-settings/${userId}`, settings);
      alert('Settings updated successfully!');
      fetchData();
    } catch (error) {
      console.error('Update settings error:', error);
    }
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-gray-300">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-3xl font-bold text-teal-600">{stats?.totalUsers || 0}</div>
        <div className="text-gray-600 dark:text-gray-300 mt-2">Total Users</div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-3xl font-bold text-blue-600">{stats?.totalSpaces || 0}</div>
        <div className="text-gray-600 dark:text-gray-300 mt-2">Spaces</div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-3xl font-bold text-purple-600">{stats?.totalPosts || 0}</div>
        <div className="text-gray-600 dark:text-gray-300 mt-2">Posts</div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-3xl font-bold text-orange-600">{stats?.activeUsers || 0}</div>
        <div className="text-gray-600 dark:text-gray-300 mt-2">Active Users</div>
      </div>
      
      <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium mb-4">Top Spaces</h3>
        <div className="space-y-4">
          {stats?.topSpaces && stats.topSpaces.length > 0 ? (
            stats.topSpaces.map(space => (
              <div key={space.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{space.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">ID: {space.id}</div>
                </div>
                <div className="text-xl font-bold">{space.member_count} members</div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No spaces found</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stats</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {users.map(user => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <img 
                    src={`${process.env.REACT_APP_BACKEND_URL}${currentUser.avatar}` || '/default-avatar.png'} 
                    alt={user.name} 
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {user.is_suspended ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    Banned
                  </span>
                ) : user.is_active ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    Inactive
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <div className="flex space-x-2">
                  <span>Posts: {user.post_count || 0}</span>
                  <span>Spaces: {user.space_count || 0}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {user.is_suspended ? (
                  <button 
                    onClick={() => handleUnbanUser(user.id)}
                    className="text-green-600 hover:text-green-900 mr-2"
                  >
                    Unban
                  </button>
                ) : (
                  <button 
                    onClick={() => handleBanUser(user.id)}
                    className="text-yellow-600 hover:text-yellow-900 mr-2"
                  >
                    Ban
                  </button>
                )}
                <button 
                  onClick={() => handleDeleteUser(user.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSpaces = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Space</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Visibility</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stats</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {spaces.map(space => (
            <tr key={space.id}>
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900 dark:text-white">{space.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{space.description}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {space.is_private ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                    Private
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    Public
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <div className="flex space-x-2">
                  <span>Members: {space.member_count || 0}</span>
                  <span>Posts: {space.post_count || 0}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <button 
                  onClick={() => handleDeleteSpace(space.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPosts = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Content</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Author</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stats</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {posts.map(post => (
            <tr key={post.id}>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 dark:text-gray-200 line-clamp-2">{post.content}</div>
                {post.space_name && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Space: {post.space_name}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{post.user_name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{post.user_email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <div className="flex space-x-2">
                  <span>Likes: {post.like_count || 0}</span>
                  <span>Comments: {post.comment_count || 0}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <button 
                  onClick={() => handleDeletePost(post.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderMessages = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Message</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sender</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Conversation</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {messages.map(message => (
            <tr key={message.id}>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 dark:text-gray-200">{message.content}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{message.sender_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {message.conversation_name || 'Private Chat'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {format(parseISO(message.created_at), 'MMM dd, yyyy HH:mm')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <button 
                  onClick={() => handleDeleteMessage(message.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderLogs = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Admin</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Target</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {logs.map(log => (
            <tr key={log.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white capitalize">
                {log.action.replace(/_/g, ' ')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {log.admin_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {log.target_type} {log.target_id ? `#${log.target_id}` : ''}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {format(parseISO(log.created_at), 'MMM dd, yyyy HH:mm')}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                {log.details && Object.entries(log.details).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium mr-1">{key}:</span>
                    <span>{value}</span>
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderConfig = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">System Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {config.map(item => (
            <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="font-medium text-gray-900 dark:text-white mb-2">{item.config_key}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{item.config_value}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">Add New Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              value={newConfig.key}
              onChange={(e) => setNewConfig({...newConfig, key: e.target.value})}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              value={newConfig.value}
              onChange={(e) => setNewConfig({...newConfig, value: e.target.value})}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddConfig}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Add
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">Send Broadcast</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              value={broadcast.title}
              onChange={(e) => setBroadcast({...broadcast, title: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              rows="3"
              value={broadcast.content}
              onChange={(e) => setBroadcast({...broadcast, content: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              value={broadcast.type}
              onChange={(e) => setBroadcast({...broadcast, type: e.target.value})}
            >
              <option value="announcement">Announcement</option>
              <option value="maintenance">Maintenance</option>
              <option value="update">Update</option>
            </select>
          </div>
          <button
            onClick={handleSendBroadcast}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Send Broadcast
          </button>
        </div>
      </div>
    </div>
  );

  const renderUserSettings = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">User Settings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Theme</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Notifications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Language</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {userSettings.map(settings => (
                <tr key={settings.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {settings.user_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {settings.theme}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {settings.notifications ? 'Enabled' : 'Disabled'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 uppercase">
                    {settings.language}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedUser(settings)}
                      className="text-teal-600 hover:text-teal-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {selectedUser && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4">Edit Settings for User #{selectedUser.user_id}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                value={selectedUser.theme}
                onChange={(e) => setSelectedUser({...selectedUser, theme: e.target.value})}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                value={selectedUser.language}
                onChange={(e) => setSelectedUser({...selectedUser, language: e.target.value})}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notifications</label>
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={selectedUser.notifications}
                    onChange={(e) => setSelectedUser({...selectedUser, notifications: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
                <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                  {selectedUser.notifications ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Notifications</label>
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={selectedUser.email_notifications}
                    onChange={(e) => setSelectedUser({...selectedUser, email_notifications: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
                <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                  {selectedUser.email_notifications ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Font Size</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                value={selectedUser.font_size}
                onChange={(e) => setSelectedUser({...selectedUser, font_size: e.target.value})}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                value={selectedUser.timezone}
                onChange={(e) => setSelectedUser({...selectedUser, timezone: e.target.value})}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Paris (CET/CEST)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
              </select>
            </div>
            <div className="col-span-full flex justify-end space-x-4">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateUserSettings(selectedUser.user_id, selectedUser)}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPagination = () => (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-gray-700 dark:text-gray-300">
        Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
        <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
        <span className="font-medium">{pagination.total}</span> results
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className={`px-3 py-1 rounded ${
            pagination.page === 1 
              ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400' 
              : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
          }`}
        >
          Previous
        </button>
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page * pagination.limit >= pagination.total}
          className={`px-3 py-1 rounded ${
            pagination.page * pagination.limit >= pagination.total
              ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <div className="w-1/3">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            'dashboard', 'users', 'spaces', 'posts', 
            'messages', 'logs', 'config', 'user-settings'
          ].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPagination({ page: 1, limit: 10, total: 0 });
                setSearch('');
                setSelectedUser(null);
              }}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'spaces' && renderSpaces()}
            {activeTab === 'posts' && renderPosts()}
            {activeTab === 'messages' && renderMessages()}
            {activeTab === 'logs' && renderLogs()}
            {activeTab === 'config' && renderConfig()}
            {activeTab === 'user-settings' && renderUserSettings()}
            
            {pagination.total > pagination.limit && renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
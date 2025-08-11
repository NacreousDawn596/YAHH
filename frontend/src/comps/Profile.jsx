import { useState, useEffect } from 'react';
import axios from 'axios';

const Profile = ({ currentUser, updateUser }) => {
    const [selectedImages, setSelectedImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        title: '',
        department: '',
        bio: '',
        status: 'online',
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.name,
                title: currentUser.title || '',
                department: currentUser.department || '',
                bio: currentUser.bio || '',
                status: currentUser.status || 'online',
            });
            setAvatarPreview(`${process.env.REACT_APP_BACKEND_URL}${currentUser.avatar}` || '/default-avatar.png');
        }
    }, [currentUser]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarChange = async (e) => {
        if (!e.target.files[0]) return;

        const file = e.target.files[0];

        // Show preview in UI
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result);
        };
        reader.readAsDataURL(file);

        setAvatarFile(file);
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('images', file); 

            const response = await axios.post('/upload', formData, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            const data = await response.data;

            setAvatarFile(data.urls[0]); 
        } catch (error) {
            console.error('Error uploading avatar:', error);
        } finally {
            setUploading(false);
        }
    };



    const handlePasswordChange = (e) => {
        setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
    };

    const handleSubmitProfile = async (e) => {
        e.preventDefault();
        try {
            formData.avatar = avatarFile
            const response = await axios.put('/users/profile', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setSuccess('Profile updated successfully');
            setTimeout(() => setSuccess(''), 3000);
            setErrors({});
        } catch (error) {
            console.log(error)
            if (error.response?.data?.errors) {
                // Format validation errors
                const validationErrors = {};
                error.response.data.errors.forEach(err => {
                    validationErrors[err.path] = err.msg;
                });
                setErrors(validationErrors);
            } else {
                setErrors({ general: error.response?.data?.message || 'Update failed' });
            }
        }
    };

    const handleSubmitPassword = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setErrors({ password: "Passwords don't match" });
            return;
        }

        try {
            await axios.put('/users/me/password', passwordForm);
            setSuccess('Password changed successfully');
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setTimeout(() => setSuccess(''), 3000);
            setErrors({});
        } catch (error) {
            setErrors(error.response?.data?.errors || { general: 'Password change failed' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

            {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    {success}
                </div>
            )}

            {errors.general && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {errors.general}
                </div>
            )}

            <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                <form onSubmit={handleSubmitProfile}>
                    <div className="flex items-start space-x-6 mb-6">
                        <div className="flex-shrink-0">
                            <img
                                src={`${avatarPreview}`}
                                alt="Profile"
                                className="w-24 h-24 rounded-full object-cover border"
                            />
                            <label className="block mt-2 text-center text-sm text-teal-600 cursor-pointer">
                                Change Photo
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                />
                            </label>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                                    required
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <input
                                    type="text"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border rounded-lg ${errors.bio ? 'border-red-500' : 'border-gray-300'}`}
                                    rows="3"
                                    placeholder="Tell us about yourself..."
                                    maxLength={500}
                                ></textarea>
                                <div className="text-xs text-gray-500 mt-1 text-right">
                                    {formData.bio.length}/500 characters
                                </div>
                                {errors.bio && <p className="mt-1 text-sm text-red-600">{errors.bio}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="online">Online</option>
                                    <option value="away">Away</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                        >
                            Save Profile
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">Change Password</h2>
                {errors.password && (
                    <div className="text-red-500 mb-4">{errors.password}</div>
                )}

                <form onSubmit={handleSubmitPassword}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <input
                                type="password"
                                name="currentPassword"
                                value={passwordForm.currentPassword}
                                onChange={handlePasswordChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={passwordForm.newPassword}
                                onChange={handlePasswordChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                required
                                minLength="6"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={passwordForm.confirmPassword}
                                onChange={handlePasswordChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                required
                                minLength="6"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                        >
                            Update Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
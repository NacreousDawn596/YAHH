import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

const Settings = ({ currentUser }) => {
    const { settings, updateSettings } = useSettings();
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    if (!settings) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-64 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        );
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        updateSettings({
            ...settings,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateSettings(settings);
            setSuccess('Settings saved successfully');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to save settings');
            console.error('Settings save error:', err);
            setTimeout(() => setError(''), 3000);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Appearance Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-gray-300 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-300">Appearance</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Theme
                            </label>
                            <div className="flex space-x-4">
                                {['light', 'dark', 'system'].map(theme => (
                                    <label
                                        key={theme}
                                        className={`flex-1 text-center p-4 rounded-lg border cursor-pointer transition-colors ${settings.theme === theme
                                                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900'
                                                : 'border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="theme"
                                            value={theme}
                                            checked={settings.theme === theme}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div className="font-medium capitalize">{theme}</div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Font Size
                            </label>
                            <select
                                name="font_size"
                                value={settings.font_size}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                            >
                                <option value="small">Small</option>
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Notifications Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-gray-300 p-6">
                    <h2 className="text-xl font-semibold mb-4">Notifications</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Enable Notifications
                                </label>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Receive desktop notifications
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="notifications"
                                    checked={settings.notifications}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email Notifications
                                </label>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Receive notifications via email
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="email_notifications"
                                    checked={settings.email_notifications}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Language & Region Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow border text-gray-300 border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-xl font-semibold mb-4">Language & Region</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 mb-2">
                                Language
                            </label>
                            <select
                                name="language"
                                value={settings.language}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-300 rounded-lg bg-white dark:bg-gray-700"
                            >
                                <option value="en">English</option>
                                <option value="es">Español</option>
                                <option value="fr">Français</option>
                                <option value="de">Deutsch</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Time Zone
                            </label>
                            <select
                                name="timezone"
                                value={settings.timezone}
                                onChange={handleChange}
                                className="w-full text-gray-300 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                            >
                                {[
                                    'UTC',
                                    'America/New_York',
                                    'America/Chicago',
                                    'America/Denver',
                                    'America/Los_Angeles',
                                    'Europe/London',
                                    'Europe/Paris',
                                    'Asia/Tokyo',
                                    'Africa/Casablanca'
                                ].map((tz) => (
                                    <option key={tz} value={tz}>
                                        {tz}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                    >
                        Save Settings
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
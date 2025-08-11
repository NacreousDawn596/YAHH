import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Sidebar = ({ currentUser }) => {
    const [spaces, setSpaces] = useState([]);

    useEffect(() => {
        const loadSpaces = async () => {
            try {
                const response = await axios.get('/spaces?my_spaces=true&limit=5');
                setSpaces(response.data.spaces);
            } catch (error) {
                console.error('Failed to load spaces:', error);
            }
        };

        loadSpaces();
    }, []);

    return (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
            <nav className="p-4 space-y-2">
                <Link to="/" className="flex items-center space-x-3 p-3 text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    <span className="font-medium">Dashboard</span>
                </Link>

                <Link to="/spaces" className="flex items-center space-x-3 p-3 text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-medium">Spaces</span>
                </Link>

                <Link to="/calendar" className="flex items-center space-x-3 p-3 text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Calendar</span>
                </Link>

                <Link to="/messages" className="flex items-center space-x-3 p-3 text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="font-medium">Messages</span>
                </Link>

                <Link to="/profile" className="flex items-center space-x-3 p-3 text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium">Profile</span>
                </Link>

                <hr className="my-4" />

                <div className="space-y-2">
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Spaces</h3>
                    {spaces.map((space) => (
                        <Link key={space.id} to={`/spaces/${space.id}`} className="flex items-center space-x-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                            <div className={`w-3 h-3 rounded-full ${space.color}`}></div>
                            <span className="text-sm">{space.name}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </aside>
    );
};

export { Sidebar };
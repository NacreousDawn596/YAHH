import { useState, useEffect } from 'react';
import axios from 'axios';

const Calendar = ({ currentUser }) => {
    const [events, setEvents] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        start: new Date(),
        end: new Date(new Date().setHours(new Date().getHours() + 1)),
        isPrivate: false,
        mentions: []
    });
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [canEdit, setCanEdit] = useState(false); // Added canEdit state

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

                const response = await axios.get('/events', {
                    params: {
                        start: monthStart.toISOString(),
                        end: monthEnd.toISOString(),
                        userId: currentUser.id
                    }
                });
                setEvents(response.data.events);
            } catch (error) {
                console.error('Failed to load events:', error);
            }
        };

        loadEvents();
    }, [currentMonth, currentUser.id]);

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

    const navigateMonth = (direction) => {
        setCurrentMonth(new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + direction,
            1
        ));
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewEvent(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleDateChange = (name, value) => {
        setNewEvent(prev => ({
            ...prev,
            [name]: new Date(value)
        }));
    };

    const addUser = (user, type) => {
        const key = 'mentions';

        if (!newEvent[key].some(u => u.id === user.id)) {
            setNewEvent(prev => ({
                ...prev,
                [key]: [...prev[key], user]
            }));
        }

        setUserSearch('');
        setSearchResults([]);
    };

    const removeUser = (userId, type) => {
        const key = 'mentions';

        setNewEvent(prev => ({
            ...prev,
            [key]: prev[key].filter(u => u.id !== userId)
        }));
    };

    const saveEvent = async () => {
        try {
            const endpoint = selectedEvent
                ? `/events/${selectedEvent.id}`
                : '/events';

            const method = selectedEvent ? 'put' : 'post';

            const response = await axios[method](endpoint, {
                ...newEvent,
                start: newEvent.start.toISOString(),
                end: newEvent.end.toISOString(),
                mentions: newEvent.mentions.map(u => u.id)
            });

            if (selectedEvent) {
                setEvents(events.map(e => e.id === selectedEvent.id ? response.data.event : e));
            } else {
                setEvents([...events, response.data.event]);
            }

            closeForm();
        } catch (error) {
            console.error('Failed to save event:', error);
        }
    };

    const deleteEvent = async () => {
        if (!selectedEvent) return;

        try {
            await axios.delete(`/events/${selectedEvent.id}`);
            setEvents(events.filter(e => e.id !== selectedEvent.id));
            closeForm();
        } catch (error) {
            console.error('Failed to delete event:', error);
        }
    };

    const openNewForm = (date) => {
        setSelectedEvent(null);
        setShowForm(true);
        setCanEdit(true);
        setNewEvent({
            title: '',
            description: '',
            start: date || new Date(),
            end: new Date((date || new Date()).getTime() + 60 * 60 * 1000),
            isPrivate: false,
            mentions: []
        });
    };

    const openEditForm = (event) => {
        setSelectedEvent(event);
        setShowForm(true);

        const isCreator = event.creator_id === currentUser.id;
        const isAdmin = currentUser.is_admin;
        setCanEdit(isCreator || isAdmin);

        setNewEvent({
            title: event.title,
            description: event.description,
            isPrivate: event.isPrivate,
            start: new Date(event.start),
            end: new Date(event.end),
            mentions: event.mentions || []
        });
    };

    const closeForm = () => {
        setShowForm(false);
        setSelectedEvent(null);
        setUserSearch('');
        setSearchResults([]);
        setCanEdit(false);
    };

    const renderReadOnlyField = (label, value) => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                {value || <span className="text-gray-400">Not specified</span>}
            </div>
        </div>
    );

    const renderCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDay = firstDay.getDay();

        const prevMonthLastDay = new Date(year, month, 0).getDate();

        const days = [];

        for (let i = startDay - 1; i >= 0; i--) {
            const date = new Date(year, month - 1, prevMonthLastDay - i);
            days.push(
                <div key={`prev-${i}`} className="p-2 bg-gray-50 text-gray-400">
                    {date.getDate()}
                </div>
            );
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dayEvents = events.filter(event => {
                const eventDate = new Date(event.start);
                return eventDate.getDate() === date.getDate() &&
                    eventDate.getMonth() === date.getMonth() &&
                    eventDate.getFullYear() === date.getFullYear();
            });

            const isToday = date.toDateString() === new Date().toDateString();

            days.push(
                <div
                    key={`current-${i}`}
                    className={`p-2 border border-gray-200 min-h-24 relative ${isToday ? 'bg-blue-50' : ''}`}
                >
                    <div className={`text-right ${isToday ? 'font-bold' : ''}`}>
                        {i}
                    </div>

                    <div className="mt-1 space-y-1 max-h-20 overflow-y-auto">
                        {dayEvents.map(event => (
                            <div
                                key={event.id}
                                className={`p-1 text-xs rounded truncate cursor-pointer ${event.isPrivate
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-teal-100 text-teal-800'
                                    }`}
                                onClick={() => openEditForm(event)}
                            >
                                {event.title}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => openNewForm(date)}
                        className="absolute bottom-1 right-1 text-gray-500 hover:text-teal-600"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </button>
                </div>
            );
        }

        const totalCells = 42; // 6 weeks * 7 days
        const remaining = totalCells - days.length;

        for (let i = 1; i <= remaining; i++) {
            const date = new Date(year, month + 1, i);
            days.push(
                <div key={`next-${i}`} className="p-2 bg-gray-50 text-gray-400">
                    {date.getDate()}
                </div>
            );
        }

        return days;
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
                <button
                    onClick={() => openNewForm()}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create Event</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <button
                        onClick={() => navigateMonth(-1)}
                        className="p-2 rounded-full hover:bg-gray-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <h2 className="text-xl font-semibold text-gray-800">
                        {currentMonth.toLocaleString('default', { month: 'long' })} {currentMonth.getFullYear()}
                    </h2>

                    <button
                        onClick={() => navigateMonth(1)}
                        className="p-2 rounded-full hover:bg-gray-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center font-medium text-gray-700 p-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {renderCalendarDays()}
                </div>
            </div>

            {/* Event Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {selectedEvent
                                        ? (canEdit ? 'Edit Event' : 'Event Details')
                                        : 'Create New Event'}
                                </h3>
                                <button
                                    onClick={closeForm}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {selectedEvent && !canEdit ? (
                                <div>
                                    {renderReadOnlyField('Title', newEvent.title)}
                                    {renderReadOnlyField('Description', newEvent.description)}

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Start
                                            </label>
                                            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                                                {newEvent.start.toLocaleString()}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                End
                                            </label>
                                            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                                                {newEvent.end.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Visibility
                                        </label>
                                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                                            {newEvent.isPrivate ? 'Private' : 'Public'}
                                        </div>
                                    </div>

                                    {newEvent.mentions.length > 0 && (
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Mentioned People
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {newEvent.mentions.map(user => (
                                                    <Link
                                                        key={user.id}
                                                        className="flex items-center bg-teal-100 text-teal-800 rounded-full px-3 py-1 text-sm"
                                                        to={`/user/${user.id}`}
                                                    >
                                                        <img
                                                            src={`${process.env.REACT_APP_BACKEND_URL}${user.avatar}` || '/default-avatar.png'}
                                                            alt={user.name}
                                                            className="w-6 h-6 rounded-full mr-2"
                                                        />
                                                        <span>{user.name}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-4">
                                        <button
                                            onClick={closeForm}
                                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={newEvent.title}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Description
                                        </label>
                                        <textarea
                                            name="description"
                                            value={newEvent.description}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Start
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={new Date(newEvent.start.getTime() - newEvent.start.getTimezoneOffset() * 60000)
                                                    .toISOString()
                                                    .slice(0, 16)}
                                                onChange={(e) => handleDateChange('start', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                End
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={new Date(newEvent.end.getTime() - newEvent.end.getTimezoneOffset() * 60000)
                                                    .toISOString()
                                                    .slice(0, 16)}
                                                onChange={(e) => handleDateChange('end', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="isPrivate"
                                            checked={newEvent.isPrivate}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                        />
                                        <label className="ml-2 block text-sm text-gray-700">
                                            Private event (only visible to you and invitees)
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mention People
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={userSearch}
                                                onChange={(e) => setUserSearch(e.target.value)}
                                                placeholder="Search users to mention..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                            />

                                            {searchResults.length > 0 && (
                                                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                                                    {searchResults.map(user => (
                                                        <div
                                                            key={user.id}
                                                            className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                            onClick={() => addUser(user, 'mention')}
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
                                            {newEvent.mentions.map(user => (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center bg-teal-100 text-teal-800 rounded-full px-3 py-1 text-sm"
                                                >
                                                    <span>{user.name}</span>
                                                    <button
                                                        onClick={() => removeUser(user.id, 'mention')}
                                                        className="ml-2 text-teal-800 hover:text-teal-900"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-between pt-4">
                                        <div>
                                            {selectedEvent && (
                                                <button
                                                    type="button"
                                                    onClick={deleteEvent}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                                >
                                                    Delete Event
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                type="button"
                                                onClick={closeForm}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={saveEvent}
                                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                                            >
                                                {selectedEvent ? 'Update Event' : 'Create Event'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export { Calendar };
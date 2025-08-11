import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const loadSettings = async () => {
            try {
                const response = await axios.get('/settings');
                if (!cancelled) {
                    setSettings(response.data.settings);
                    applyTheme(response.data.settings.theme);
                    applyFontSize(response.data.settings.font_size);
                }
            } catch (err) {
                if (!cancelled) {
                    if (err.response?.status === 401) {
                        setError('unauthorized');
                    } else {
                        setError('Failed to load settings');
                    }
                    console.error('Settings load error:', err);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadSettings();

        return () => {
            cancelled = true;
        };
    }, []);



    const applyTheme = (theme) => {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (theme === 'system') {
            document.documentElement.classList.toggle('dark', systemPrefersDark);
        } else {
            document.documentElement.classList.toggle('dark', theme === 'dark');
        }
    };

    const applyFontSize = (fontSize) => {
        document.documentElement.style.fontSize =
            fontSize === 'small' ? '14px' :
                fontSize === 'large' ? '18px' : '16px';
    };

    const updateSettings = async (newSettings) => {
        try {
            const response = await axios.put('/settings', newSettings);
            setSettings(response.data.settings);
            applyTheme(newSettings.theme);
            applyFontSize(newSettings.font_size);
            return response.data.settings;
        } catch (err) {
            console.error('Settings update error:', err);
            throw err;
        }
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            loading,
            error,
            updateSettings
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
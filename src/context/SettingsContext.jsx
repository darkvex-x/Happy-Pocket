import React, { createContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storage';

export const SettingsContext = createContext({
  settings: {
    businessName: "Digi Moi",
    receiptPrefix: "Moi-",
    currency: "₹",
    paperWidth: "58mm",
    theme: "light"
  },
  isLoading: true,
  updateSettings: async () => {},
  toggleTheme: () => {},
  theme: 'light'
});

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    businessName: "Digi Moi",
    receiptPrefix: "Moi-",
    currency: "₹",
    paperWidth: "58mm",
    theme: "light"
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const s = await StorageService.getSettings();
      if (s) {
        setSettings(s);
        applyTheme(s.theme || 'light');
      }
    } catch (error) {
      console.error("Failed to load settings in SettingsProvider:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const applyTheme = (themeMode) => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const updateSettings = async (updates) => {
    try {
      const updated = await StorageService.saveSettings(updates);
      setSettings(updated);
      if (updated.theme) {
        applyTheme(updated.theme);
      }
      return updated;
    } catch (error) {
      console.error("Failed to update settings:", error);
      throw error;
    }
  };

  const toggleTheme = async () => {
    const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
    await updateSettings({ ...settings, theme: nextTheme });
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      isLoading,
      updateSettings,
      toggleTheme,
      theme: settings.theme
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

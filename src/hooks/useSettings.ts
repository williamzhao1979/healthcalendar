"use client";

import { useState, useEffect } from "react";
import dbService, { Settings } from "@/services/db";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载设置
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const loadedSettings = await dbService.getSettings();
      setSettings(loadedSettings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  // 更新设置
  const updateSettings = async (settingsData: Partial<Omit<Settings, "id" | "updatedAt">>) => {
    try {
      const updatedSettings = await dbService.updateSettings(settingsData);
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  // 更新当前选中的用户
  const setCurrentUser = async (userId: string) => {
    return updateSettings({ lastUserId: userId });
  };

  // 初始化数据库并加载设置
  useEffect(() => {
    const initAndLoad = async () => {
      try {
        // 先确保数据库已初始化
        await dbService.initDB();
        console.log("useSettings: 数据库已初始化");
        // 然后加载设置
        await loadSettings();
      } catch (err) {
        console.error("useSettings: 初始化或加载设置时出错", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };
    
    initAndLoad();
  }, []);

  return {
    settings,
    isLoading,
    error,
    loadSettings,
    updateSettings,
    setCurrentUser,
    currentUserId: settings?.lastUserId || ""
  };
}

"use client";

import { useState, useEffect } from "react";
import dbService, { User } from "@/services/db";

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载所有用户
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const loadedUsers = await dbService.getUsers();
      setUsers(loadedUsers);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  // 添加新用户
  const addUser = async (userData: Omit<User, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newUser = await dbService.addUser(userData);
      setUsers(prevUsers => [...prevUsers, newUser]);
      return newUser;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  // 更新用户
  const updateUser = async (id: string, userData: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>) => {
    try {
      const updatedUser = await dbService.updateUser(id, userData);
      setUsers(prevUsers => 
        prevUsers.map(user => user.id === id ? updatedUser : user)
      );
      return updatedUser;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  // 删除用户
  const deleteUser = async (id: string) => {
    try {
      await dbService.deleteUser(id);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  // 初始化数据库并加载用户
  useEffect(() => {
    const initAndLoad = async () => {
      try {
        // 先确保数据库已初始化
        await dbService.initDB();
        console.log("useUsers: 数据库已初始化");
        // 然后加载用户
        await loadUsers();
      } catch (err) {
        console.error("useUsers: 初始化或加载用户时出错", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };
    
    initAndLoad();
  }, []);

  return {
    users,
    isLoading,
    error,
    loadUsers,
    addUser,
    updateUser,
    deleteUser
  };
}

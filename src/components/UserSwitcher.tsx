"use client";

import { useState, useEffect } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useSettings } from "@/hooks/useSettings";
import { useMigration } from "@/hooks/useMigration";
import { User } from "@/services/db";

interface UserSwitcherProps {
  onUserChange?: (userId: string) => void;
}

export default function UserSwitcher({ onUserChange }: UserSwitcherProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserRelationship, setNewUserRelationship] = useState("");
  
  // 使用hooks
  const { users, addUser, loadUsers } = useUsers();
  const { settings, currentUserId, setCurrentUser, loadSettings } = useSettings();
  
  // 数据迁移hook
  useMigration();

  // 处理用户变更
  const handleUserChange = async (userId: string) => {
    try {
      await setCurrentUser(userId);
      if (onUserChange) {
        onUserChange(userId);
      }
    } catch (error) {
      console.error("切换用户失败:", error);
    }
  };

  // 处理添加新用户
  const handleAddUser = async () => {
    if (!newUserName.trim()) return;

    try {
      const userData: Omit<User, "id" | "createdAt" | "updatedAt"> = {
        name: newUserName.trim(),
      };
      
      if (newUserRelationship.trim()) {
        userData.relationship = newUserRelationship.trim();
      }
      
      const newUser = await addUser(userData);
      
      // 如果这是第一个用户，自动选择它
      if (users.length === 0) {
        await setCurrentUser(newUser.id);
        if (onUserChange) {
          onUserChange(newUser.id);
        }
      }
      
      // 重置表单
      setNewUserName("");
      setNewUserRelationship("");
      setShowAddForm(false);
    } catch (error) {
      console.error("添加用户失败:", error);
    }
  };

  // 创建默认用户
  useEffect(() => {
    const createDefaultUser = async () => {
      if (users.length === 0) {
        try {
          const defaultUser = await addUser({ name: "我" });
          await setCurrentUser(defaultUser.id);
          if (onUserChange) {
            onUserChange(defaultUser.id);
          }
        } catch (error) {
          console.error("创建默认用户失败:", error);
        }
      } else if (!currentUserId && users.length > 0) {
        // 如果有用户但没有选择当前用户，选择第一个
        await setCurrentUser(users[0].id);
        if (onUserChange) {
          onUserChange(users[0].id);
        }
      }
    };

    createDefaultUser();
  }, [users, currentUserId]);

  // 如果数据还在加载中，显示加载状态
  if (!users.length) {
    return <div className="text-center p-4">加载中...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-2">用户管理</h2>
      
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleUserChange(user.id)}
              className={`py-1 px-3 rounded-full text-sm ${
                user.id === currentUserId 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {user.name}
              {user.relationship ? ` (${user.relationship})` : ""}
            </button>
          ))}
        </div>
      </div>
      
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-1 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-md text-sm flex items-center justify-center"
        >
          <span>+</span> 添加新用户
        </button>
      ) : (
        <div className="border p-3 rounded-md bg-gray-50">
          <div className="mb-2">
            <label className="block text-xs mb-1">姓名</label>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full p-1 border rounded"
              placeholder="输入姓名"
            />
          </div>
          
          <div className="mb-2">
            <label className="block text-xs mb-1">关系（可选）</label>
            <input
              type="text"
              value={newUserRelationship}
              onChange={(e) => setNewUserRelationship(e.target.value)}
              className="w-full p-1 border rounded"
              placeholder="如：妻子、父亲等"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleAddUser}
              className="flex-1 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
              disabled={!newUserName.trim()}
            >
              保存
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

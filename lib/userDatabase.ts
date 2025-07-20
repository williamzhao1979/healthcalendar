// IndexedDB工具类，用于管理用户数据
export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  isActive: boolean;
  createdAt: Date;
}

class UserDatabase {
  private dbName = 'HealthCalendarDB';
  private version = 2; // 增加版本号以触发数据库升级
  private storeName = 'users';
  private isInitialized = false;

  // 确保数据库已初始化
  async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      const db = await this.openDB();
      db.close();
      this.isInitialized = true;
    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw error;
    }
  }

  // 打开数据库连接
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 验证对象存储是否存在
        if (!db.objectStoreNames.contains(this.storeName)) {
          // 如果对象存储不存在，关闭当前连接并强制升级
          db.close();
          const upgradeRequest = indexedDB.open(this.dbName, this.version + 1);
          
          upgradeRequest.onupgradeneeded = (upgradeEvent) => {
            const upgradeDB = (upgradeEvent.target as IDBOpenDBRequest).result;
            if (!upgradeDB.objectStoreNames.contains(this.storeName)) {
              const store = upgradeDB.createObjectStore(this.storeName, { keyPath: 'id' });
              store.createIndex('name', 'name', { unique: false });
              store.createIndex('isActive', 'isActive', { unique: false });
            }
          };
          
          upgradeRequest.onsuccess = () => {
            resolve(upgradeRequest.result);
          };
          
          upgradeRequest.onerror = () => {
            reject(new Error('Failed to upgrade database'));
          };
        } else {
          resolve(db);
        }
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建用户存储表
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('isActive', 'isActive', { unique: false });
        }
      };
    });
  }

  // 添加用户
  async addUser(userData: Omit<User, 'id' | 'createdAt'>, customId?: string): Promise<User> {
    await this.ensureInitialized(); // 确保数据库已初始化
    const db = await this.openDB();
    
    const user: User = {
      id: customId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...userData,
      createdAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(user);

      request.onsuccess = () => {
        resolve(user);
      };

      request.onerror = () => {
        reject(new Error('Failed to add user'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  // 获取所有用户
  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized(); // 确保数据库已初始化
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get users'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  // 根据ID获取用户
  async getUserById(id: string): Promise<User | null> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get user'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  // 更新用户
  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    const db = await this.openDB();

    return new Promise(async (resolve, reject) => {
      try {
        const existingUser = await this.getUserById(id);
        if (!existingUser) {
          reject(new Error('User not found'));
          return;
        }

        const updatedUser: User = {
          ...existingUser,
          ...updates,
        };

        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(updatedUser);

        request.onsuccess = () => {
          resolve(updatedUser);
        };

        request.onerror = () => {
          reject(new Error('Failed to update user'));
        };

        transaction.oncomplete = () => {
          db.close();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // 删除用户
  async deleteUser(id: string): Promise<boolean> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(new Error('Failed to delete user'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  // 设置当前用户（将其他用户设为非当前）
  async setActiveUser(userId: string): Promise<void> {
    const users = await this.getAllUsers();
    
    const updatePromises = users.map(user => {
      return this.updateUser(user.id, { isActive: user.id === userId });
    });

    await Promise.all(updatePromises);
  }

  // 获取当前当前用户
  async getActiveUser(): Promise<User | null> {
    const users = await this.getAllUsers();
    return users.find(user => user.isActive) || null;
  }

  // 初始化默认用户（如果没有用户的话）
  async initializeDefaultUser(): Promise<User> {
    const users = await this.getAllUsers();
    
    // 检查是否存在 user_self 用户
    let selfUser = users.find(user => user.id === 'user_self');
    
    // 如果 user_self 不存在，则创建它
    if (!selfUser) {
      selfUser = await this.addUser({
        name: '本人',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
        isActive: users.length === 0, // 如果是第一个用户则设为激活状态
      }, 'user_self'); // 使用固定的 user_self 作为主键
      
      console.log('已创建默认用户 user_self:', selfUser);
      
      // 重新获取用户列表
      const updatedUsers = await this.getAllUsers();
      
      // 如果这是唯一用户或没有激活用户，则激活 user_self
      const activeUser = updatedUsers.find(user => user.isActive);
      if (!activeUser || updatedUsers.length === 1) {
        await this.setActiveUser('user_self');
        selfUser.isActive = true;
      }
      
      return selfUser;
    }
    
    // user_self 存在，检查是否有激活用户
    const activeUser = users.find(user => user.isActive);
    if (!activeUser && users.length > 0) {
      // 如果没有激活用户，默认激活第一个用户
      await this.setActiveUser(users[0].id);
      return users[0];
    }

    return activeUser || selfUser;
  }
}

// 导出单例实例
export const userDB = new UserDatabase();

// 用户管理相关的工具函数
export const UserUtils = {
  // 格式化用户创建时间
  formatCreatedTime: (createdAt: Date): string => {
    const now = new Date();
    const diff = now.getTime() - createdAt.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return createdAt.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  },

  // 生成用户显示名称
  getDisplayName: (user: User): string => {
    return user.name || '未命名用户';
  },

  // 检查用户名是否有效
  isValidUserName: (name: string): boolean => {
    return name.trim().length > 0 && name.trim().length <= 20;
  }
};

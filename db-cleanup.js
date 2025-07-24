// 数据库清理工具
// 在浏览器控制台中运行此脚本来清理 IndexedDB
// 注意：HealthCalendarDB 的版本号请与 /lib/dbVersion.ts 保持同步
const HEALTH_CALENDAR_DB_VERSION = 5; // 如有升级请同步修改

async function clearHealthCalendarDB() {
  try {
    console.log('开始清理 HealthCalendarDB...');
    
    // 关闭所有可能的连接
    if (window.indexedDB) {
      const deleteReq = window.indexedDB.deleteDatabase('HealthCalendarDB');
      
      deleteReq.onsuccess = function() {
        console.log('✅ HealthCalendarDB 已成功删除');
        console.log('请刷新页面以重新初始化数据库');
      };
      
      deleteReq.onerror = function() {
        console.error('❌ 删除数据库时出错:', deleteReq.error);
      };
      
      deleteReq.onblocked = function() {
        console.warn('⚠️ 数据库删除被阻止，请关闭所有使用该数据库的标签页后重试');
      };
    } else {
      console.error('❌ 浏览器不支持 IndexedDB');
    }
  } catch (error) {
    console.error('❌ 清理数据库时发生错误:', error);
  }
}

// 运行清理
clearHealthCalendarDB();

// 创建示例用户的辅助函数
async function createSampleUsers() {
  const userDB = {
    async addUser(name, avatarUrl) {
      const request = indexedDB.open('HealthCalendarDB', HEALTH_CALENDAR_DB_VERSION);
      
      request.onsuccess = function() {
        const db = request.result;
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        
        const user = {
          id: Date.now().toString(),
          name: name,
          avatarUrl: avatarUrl,
          isActive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const addRequest = store.add(user);
        addRequest.onsuccess = function() {
          console.log(`✅ 用户 "${name}" 已添加`);
        };
        addRequest.onerror = function() {
          console.error(`❌ 添加用户 "${name}" 失败:`, addRequest.error);
        };
      };
    }
  };
  
  console.log('创建示例用户...');
  
  // 示例用户数据
  const users = [
    { name: '小雨', avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b2e4d93d?w=32&h=32&fit=crop&crop=face' },
    { name: '小明', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face' },
    { name: '小丽', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face' }
  ];
  
  // 延迟一下，确保数据库已经重新创建
  setTimeout(() => {
    users.forEach(user => {
      userDB.addUser(user.name, user.avatarUrl);
    });
  }, 1000);
}

console.log('运行 createSampleUsers() 来创建示例用户');

# OneDrive同步功能技术方案

## 1. 功能概述
- 在设置页面中添加OneDrive同步开关
- 启用时进行Windows认证并选择数据存放目录
- 将IndexedDB中的健康记录数据导出为JSON文件同步到OneDrive
- 支持图片、音频、文档等附件的云端同步

## 2. 技术实现方案

### 2.1 认证方式选择
**推荐方案：Microsoft Graph API**
- 使用 `@azure/msal-browser` 进行Microsoft账户认证
- 通过Microsoft Graph API访问OneDrive
- 支持OAuth 2.0标准认证流程

**替代方案：文件系统API（限制较多）**
- 使用Web File System Access API
- 仅支持较新的浏览器
- 用户需要手动选择文件夹

### 2.2 数据同步流程
1. **认证阶段**
   - 用户点击OneDrive同步开关
   - 弹出Microsoft登录窗口
   - 获取访问令牌和用户权限

2. **目录选择**
   - 通过Graph API获取OneDrive文件夹列表
   - 用户选择或创建专用文件夹（如：`/Apps/HealthCalendar/`）
   - 保存文件夹路径到本地配置

3. **数据导出**
   - 从IndexedDB读取所有用户数据
   - 按用户ID组织数据结构
   - 生成JSON文件（如：`health_data_${userId}_${timestamp}.json`）

4. **上传同步**
   - 使用Graph API上传文件到OneDrive
   - 实现增量同步（检查文件修改时间）
   - 保存同步状态和最后同步时间

## 3. 完整目录结构设计

```
OneDrive/Apps/HealthCalendar/
├── users/
│   ├── user_self/
│   │   ├── data/
│   │   │   ├── stool_records.json
│   │   │   ├── meal_records.json
│   │   │   ├── my_records.json
│   │   │   └── user_profile.json
│   │   ├── attachments/
│   │   │   ├── images/
│   │   │   │   ├── meal_20250724_001.jpg
│   │   │   │   ├── stool_20250724_002.png
│   │   │   │   └── record_20250724_003.jpg
│   │   │   ├── documents/
│   │   │   │   ├── medical_report_001.pdf
│   │   │   │   └── prescription_002.pdf
│   │   │   └── audio/
│   │   │       ├── voice_note_001.m4a
│   │   │       └── voice_memo_002.wav
│   │   └── avatars/
│   │       └── profile_avatar.jpg
│   └── user_xxx/
│       ├── data/
│       ├── attachments/
│       └── avatars/
├── shared/
│   ├── settings.json
│   ├── sync_metadata.json
│   └── app_config.json
└── backups/
    ├── 2025-07-24/
    │   ├── full_backup_20250724_103000.zip
    │   └── incremental_20250724_150000.zip
    └── 2025-07-23/
        └── full_backup_20250723_103000.zip
```

## 4. 数据关联设计

### 4.1 JSON数据中的附件引用
```json
{
  "stoolRecords": [
    {
      "id": "stool_001",
      "date": "2025-07-24T08:30:00.000Z",
      "status": "normal",
      "type": "solid",
      "attachments": [
        {
          "id": "att_001",
          "type": "image",
          "filename": "stool_20250724_001.jpg",
          "relativePath": "attachments/images/stool_20250724_001.jpg",
          "size": 1024000,
          "mimeType": "image/jpeg",
          "uploadTime": "2025-07-24T08:35:00.000Z"
        }
      ]
    }
  ],
  "mealRecords": [
    {
      "id": "meal_001",
      "date": "2025-07-24T12:30:00.000Z",
      "mealType": "lunch",
      "attachments": [
        {
          "id": "att_002",
          "type": "image",
          "filename": "meal_20250724_002.jpg",
          "relativePath": "attachments/images/meal_20250724_002.jpg",
          "size": 2048000,
          "mimeType": "image/jpeg",
          "uploadTime": "2025-07-24T12:35:00.000Z"
        },
        {
          "id": "att_003",
          "type": "audio",
          "filename": "voice_note_001.m4a",
          "relativePath": "attachments/audio/voice_note_001.m4a",
          "size": 512000,
          "mimeType": "audio/mp4",
          "duration": 30,
          "uploadTime": "2025-07-24T12:40:00.000Z"
        }
      ]
    }
  ]
}
```

### 4.2 附件元数据管理
```json
{
  "attachmentMetadata": {
    "att_001": {
      "id": "att_001",
      "recordId": "stool_001",
      "recordType": "stool",
      "originalName": "IMG_20250724_083000.jpg",
      "storedName": "stool_20250724_001.jpg",
      "path": "attachments/images/stool_20250724_001.jpg",
      "size": 1024000,
      "mimeType": "image/jpeg",
      "hash": "sha256:abc123...",
      "createdAt": "2025-07-24T08:30:00.000Z",
      "uploadedAt": "2025-07-24T08:35:00.000Z",
      "syncStatus": "synced"
    }
  }
}
```

## 5. 同步策略

### 5.1 文件命名规范
- **图片文件**: `{recordType}_{YYYYMMDD}_{sequence}.{ext}`
- **音频文件**: `voice_{recordType}_{YYYYMMDD}_{sequence}.{ext}`
- **文档文件**: `doc_{recordType}_{YYYYMMDD}_{sequence}.{ext}`
- **头像文件**: `avatar_{userId}_{timestamp}.{ext}`

### 5.2 同步优先级
1. **高优先级**: JSON数据文件
2. **中优先级**: 图片附件
3. **低优先级**: 音频和文档附件

### 5.3 增量同步机制
```json
{
  "syncMetadata": {
    "lastFullSync": "2025-07-24T10:00:00.000Z",
    "lastIncrementalSync": "2025-07-24T15:30:00.000Z",
    "pendingUploads": [
      {
        "type": "attachment",
        "path": "attachments/images/meal_20250724_003.jpg",
        "recordId": "meal_002",
        "priority": "medium"
      }
    ],
    "syncErrors": [
      {
        "file": "attachments/audio/voice_note_002.m4a",
        "error": "Upload timeout",
        "timestamp": "2025-07-24T14:30:00.000Z",
        "retryCount": 2
      }
    ]
  }
}
```

## 6. 技术实现考虑

### 6.1 文件大小限制
- **图片**: 压缩至最大5MB
- **音频**: 最大10MB
- **文档**: 最大20MB
- **单次上传**: 最大100MB

### 6.2 存储优化
- 图片自动压缩和格式优化
- 重复文件检测（基于文件hash）
- 定期清理未引用的附件

### 6.3 离线处理
- 本地队列管理待上传文件
- 网络恢复时自动重试
- 失败重试机制（指数退避）

## 7. 用户界面设计

### 7.1 设置页面修改
- OneDrive同步开关（目前是静态的）
- 同步状态显示（已连接/未连接）
- 最后同步时间显示
- 手动同步按钮

### 7.2 认证流程界面
- Microsoft登录弹窗
- 权限确认页面
- 目录选择对话框
- 同步进度指示器

### 7.3 同步状态显示
```
OneDrive同步: ✅ 已连接
最后同步: 2分钟前
待上传: 3个文件 (2.1MB)
□ meal_photo_001.jpg (1.2MB)
□ voice_note_002.m4a (0.7MB) 
□ document_001.pdf (0.2MB)
```

### 7.4 附件管理
- 附件预览和下载
- 同步状态标识
- 手动重新上传选项
- 清理未使用附件功能

## 8. 技术依赖

### 8.1 新增依赖包
```json
{
  "@azure/msal-browser": "^3.x",
  "@microsoft/microsoft-graph-client": "^3.x"
}
```

### 8.2 环境配置
- 注册Microsoft Azure应用
- 配置OAuth重定向URL
- 设置Graph API权限（Files.ReadWrite）

## 9. 实现优先级

### 第一阶段：基础认证
1. 集成MSAL认证
2. 实现Microsoft登录
3. 获取OneDrive访问权限

### 第二阶段：数据导出
1. 实现IndexedDB数据导出
2. 设计JSON数据格式
3. 本地文件生成功能

### 第三阶段：云端同步
1. OneDrive目录选择
2. 文件上传功能
3. 同步状态管理

### 第四阶段：附件同步
1. 图片附件上传
2. 音频文件同步
3. 文档附件处理

### 第五阶段：增强功能
1. 增量同步
2. 冲突处理
3. 数据恢复功能

## 10. 错误处理和恢复

### 10.1 常见错误场景
- 网络中断导致上传失败
- OneDrive存储空间不足
- 文件格式不支持
- 权限过期需要重新认证

### 10.2 恢复机制
- 断点续传支持
- 自动重试机制
- 手动重新同步选项
- 本地缓存保护

## 11. 安全考虑
- 使用HTTPS确保数据传输安全
- 令牌安全存储和刷新
- 用户数据加密（可选）
- 权限最小化原则
- 文件完整性校验（hash验证）

## 12. 性能优化
- 批量上传文件减少API调用
- 压缩数据减少传输时间
- 本地缓存减少重复下载
- 后台同步不影响用户操作

---

**创建时间**: 2025年7月24日  
**版本**: v1.0  
**状态**: 设计阶段

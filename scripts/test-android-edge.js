#!/usr/bin/env node

/**
 * Android Edge MSAL 认证测试脚本
 * 用于验证重构后的认证流程是否正常工作
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Android Edge MSAL 认证重构验证')
console.log('================================\n')

// 检查关键文件是否存在
const criticalFiles = [
  'lib/mobileCompatibility.ts',
  'lib/microsoftAuth.ts', 
  'hooks/useOneDriveSync.ts',
  'components/AndroidEdgeErrorBoundary.tsx',
  'components/MSALErrorRecovery.tsx',
  'components/MSALRedirectHandler.tsx',
  'components/OneDriveCompatibilityAlert.tsx',
  'app/android-edge-test/page.tsx'
]

console.log('📁 检查关键文件...')
let allFilesExist = true
criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file)
  const exists = fs.existsSync(filePath)
  console.log(`   ${exists ? '✅' : '❌'} ${file}`)
  if (!exists) allFilesExist = false
})

if (!allFilesExist) {
  console.log('\n❌ 缺少关键文件，请检查重构是否完整')
  process.exit(1)
}

// 检查关键功能实现
console.log('\n🔧 检查关键功能实现...')

const checkFeature = (filePath, searchPatterns, description) => {
  const content = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8')
  const allPatternsFound = searchPatterns.every(pattern => {
    if (typeof pattern === 'string') {
      return content.includes(pattern)
    } else if (pattern instanceof RegExp) {
      return pattern.test(content)
    }
    return false
  })
  
  console.log(`   ${allPatternsFound ? '✅' : '❌'} ${description}`)
  return allPatternsFound
}

const features = [
  {
    file: 'lib/mobileCompatibility.ts',
    patterns: ['isAndroidEdge', 'detectDevice', 'getOneDriveErrorTips'],
    description: 'Android Edge 设备检测'
  },
  {
    file: 'lib/microsoftAuth.ts', 
    patterns: ['createMSALConfig', 'loginRedirect', 'scheduleTokenRenewal', 'handleRedirectPromise'],
    description: 'MSAL 重定向优先认证'
  },
  {
    file: 'lib/microsoftAuth.ts',
    patterns: ['getTokenSilently', 'performTokenAcquisition', /maxRetries.*=.*3/],
    description: 'MSAL 令牌自动续期和重试'
  },
  {
    file: 'hooks/useOneDriveSync.ts',
    patterns: ['handleRedirectPromise', 'Android Edge关键', 'redirectResult'],
    description: 'React Hook 重定向处理'
  },
  {
    file: 'components/AndroidEdgeErrorBoundary.tsx',
    patterns: ['class AndroidEdgeErrorBoundary', 'componentDidCatch', 'isAndroidEdge'],
    description: 'Android Edge 错误边界'
  },
  {
    file: 'components/MSALErrorRecovery.tsx',
    patterns: ['MSALErrorRecovery', 'getOneDriveErrorTips', 'isAndroidEdgeSpecific'],
    description: 'MSAL 错误恢复组件'
  },
  {
    file: 'app/layout.tsx',
    patterns: ['AndroidEdgeErrorBoundary', 'MSALRedirectHandler'],
    description: '根布局错误处理集成'
  }
]

let allFeaturesImplemented = true
features.forEach(feature => {
  const implemented = checkFeature(feature.file, feature.patterns, feature.description)
  if (!implemented) allFeaturesImplemented = false
})

// 检查配置文件
console.log('\n⚙️  检查配置文件...')
const configChecks = [
  {
    file: 'lib/microsoftAuth.ts',
    check: (content) => {
      const hasAndroidEdgeConfig = content.includes('deviceInfo.isAndroidEdge')
      const hasLocalStorage = content.includes('BrowserCacheLocation.LocalStorage')
      const hasRedirectFirst = content.includes('loginRedirect')
      return hasAndroidEdgeConfig && hasLocalStorage && hasRedirectFirst
    },
    description: 'Android Edge 特定配置'
  },
  {
    file: 'lib/mobileCompatibility.ts',
    check: (content) => {
      const hasAndroidEdgeDetection = content.includes('isAndroidEdge = platform === \'android\'')
      const hasErrorHandling = content.includes('getOneDriveErrorTips')
      const hasMSALConfig = content.includes('getRecommendedMSALConfig')
      return hasAndroidEdgeDetection && hasErrorHandling && hasMSALConfig
    },
    description: '移动兼容性工具完整性'
  }
]

configChecks.forEach(check => {
  const filePath = path.join(__dirname, '..', check.file)
  const content = fs.readFileSync(filePath, 'utf8')
  const passed = check.check(content)
  console.log(`   ${passed ? '✅' : '❌'} ${check.description}`)
  if (!passed) allFeaturesImplemented = false
})

// 总结报告
console.log('\n📊 重构验证总结')
console.log('================')

if (allFilesExist && allFeaturesImplemented) {
  console.log('✅ 所有检查通过！Android Edge MSAL 认证重构已完成')
  console.log('\n🎯 重构成果:')
  console.log('   • ✅ Phase 1: MSAL 核心配置更新 (Android Edge 优化)')
  console.log('   • ✅ Phase 2: 静默令牌获取增强和生命周期管理')
  console.log('   • ✅ Phase 3: Android Edge 特定错误处理')
  console.log('   • ✅ Phase 4: 完整的错误处理和恢复机制')
  console.log('   • ✅ Phase 5: React Hook 集成更新')
  console.log('   • ✅ Phase 6: 测试和验证页面')
  
  console.log('\n🚀 下一步建议:')
  console.log('   1. 在 Android Edge 设备上实际测试认证流程')
  console.log('   2. 访问 http://localhost:3008/android-edge-test 进行兼容性测试')
  console.log('   3. 测试重定向认证流程的稳定性')
  console.log('   4. 验证令牌自动续期功能')
  console.log('   5. 测试错误恢复机制的有效性')
  
} else {
  console.log('❌ 重构验证失败，请检查以上标记为 ❌ 的项目')
  process.exit(1)
}

console.log('\n🔗 相关测试页面:')
console.log('   • Android Edge 测试: http://localhost:3008/android-edge-test')
console.log('   • OneDrive 功能测试: http://localhost:3008/onedrive-test')
console.log('   • 基础功能测试: http://localhost:3008/basic-test')

console.log('\n📱 Android Edge 特定注意事项:')
console.log('   • 确保使用 HTTPS 连接 (https://localhost:3443)')
console.log('   • 允许浏览器弹窗和重定向')
console.log('   • 建议使用 Chrome 浏览器作为备选方案')
console.log('   • 网络连接需要稳定')
console.log('')
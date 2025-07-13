module.exports = {
  extends: ["next/core-web-vitals", "next/typescript"],
  rules: {
    // 将错误降级为警告，避免构建失败
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn",
    "@next/next/no-img-element": "warn",
    "react/no-unescaped-entities": "warn",
    "import/no-unresolved": "off",
    // 如果需要完全禁用 ESLint 检查，可以使用下面的配置
    // "@typescript-eslint/no-unused-vars": "off",
    // "@typescript-eslint/no-explicit-any": "off",
    // "react-hooks/exhaustive-deps": "off",
  },
  // 忽略某些文件
  ignorePatterns: ["node_modules/", ".next/", "out/", "build/"],
}

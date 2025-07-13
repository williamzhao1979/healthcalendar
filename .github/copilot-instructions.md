# Copilot Instructions
Common instructions for Copilot

## Must do
- Provide solutions before start code change
- Follow the coding standards and practices of the project.
- Use the project's existing code as a reference for style and structure.
- Provide clear and concise comments in the code, use English.
- Ensure that the code is well-structured and maintainable.
- Use meaningful variable and function names.
- Always use Powershell syntax: separate commands with `;`, not `&&`
- For example: `cd c:\github\williamzhao\aihelper; npm run build`

## Must not do
- Do not introduce unnecessary complexity or over-engineering.
- Avoid using external libraries or frameworks unless they are already part of the project.
- Do not make assumptions about the project structure or architecture without confirming.
- Avoid using deprecated or outdated coding practices.
- Do not ignore existing code patterns or conventions in the project.
- Do not use non English comments or variable names unless specified by the project guidelines.
- Never use `&&` to chain commands
- Do not use Unix-style command chaining like: `cd ... && ...`

## Naming Conventions
- Use camelCase for variable and function names.
- Use PascalCase for class names.
- Use UPPER_CASE for constants.
- Use descriptive names that clearly indicate the purpose of the variable or function.

## Porject Structure
src/
├── app/                 # Next.js App Router页面
├── components/          # React组件
│   ├── ui/             # shadcn/ui组件库
│   └── theme-provider.tsx
├── context/            # React Context
├── hooks/              # 自定义React Hooks
├── lib/                # 工具函数
└── services/           # 服务层（数据库等）

## Preferences

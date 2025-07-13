'use client'

import { PublicClientApplication } from '@azure/msal-browser'
import { useEffect, useState } from 'react'

const msalConfig = {
  auth: {
    clientId: 'YOUR_CLIENT_ID',
    redirectUri: window.location.origin,
  }
}

const pca = new PublicClientApplication(msalConfig)

export default function OneDriveLoginDemo() {
  const [account, setAccount] = useState(null)
  const [accessToken, setAccessToken] = useState('')

  const login = async () => {
    try {
      const loginResponse = await pca.loginPopup({
        scopes: ['Files.ReadWrite.All', 'User.Read']
      })
      setAccount(loginResponse.account)
      const tokenResponse = await pca.acquireTokenSilent({
        scopes: ['Files.ReadWrite.All', 'User.Read'],
        account: loginResponse.account,
      })
      setAccessToken(tokenResponse.accessToken)
    } catch (err) {
      console.error(err)
    }
  }

  const logout = () => {
    pca.logoutPopup()
    setAccount(null)
    setAccessToken('')
  }

  return (
    <div>
      {account ? (
        <>
          <div>欢迎，{account.username}</div>
          <button onClick={logout}>退出登录</button>
          <div>Access Token: {accessToken.substring(0, 20)}...</div>
          {/* 这里可以调用 Graph API 读写 OneDrive 数据 */}
        </>
      ) : (
        <button onClick={login}>登录 Microsoft 账号</button>
      )}
    </div>
  )
}

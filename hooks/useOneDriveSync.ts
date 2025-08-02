"use client"

import { useState } from "react"
import adminService from "../services/adminService"
import { loadOneDriveFile, saveOneDriveFile } from "../services/oneDriveService"
import { mergeRecords } from "../utils/mergeRecords"

const useOneDriveSync = () => {
  const [state, setState] = useState({
    error: null,
    syncStatus: "idle",
  })

  const syncIDBOneDrivePeriodRecords = async () => {
    try {
      console.log("开始同步 Period Records...")

      // 获取 IDB 中的数据
      const idbRecords = await adminService.getAllRecordsIDB("periodRecords")
      console.log("IDB Period Records:", idbRecords.length)

      // 获取 OneDrive 中的数据
      const oneDriveRecords = await loadOneDriveFile("periodRecords.json")
      console.log("OneDrive Period Records:", oneDriveRecords?.data?.length || 0)

      // 合并数据
      const mergedData = mergeRecords(idbRecords, oneDriveRecords?.data || [])
      console.log("Merged Period Records:", mergedData.length)

      // 保存到 OneDrive
      await saveOneDriveFile("periodRecords.json", {
        tableName: "periodRecords",
        data: mergedData,
        lastSync: new Date().toISOString(),
      })

      // 更新 IDB
      await adminService.loadToIDBFromJson({
        tableName: "periodRecords",
        data: mergedData,
      })

      console.log("Period Records 同步完成")
      setState((prev) => ({ ...prev, syncStatus: "completed" }))
    } catch (error) {
      console.error("Period Records 同步失败:", error)
      setState((prev) => ({ ...prev, error: `Period Records 同步失败: ${error.message}`, syncStatus: "failed" }))
    }
  }

  // ** rest of code here **

  return [
    state,
    {
      syncIDBOneDrivePeriodRecords,
      // ** other methods here **
    },
  ]
}

export default useOneDriveSync

// pages/index.tsx
'use client'

import { useEffect, useState } from 'react'
import Dexie, { Table } from 'dexie'

interface HealthRecord {
  id?: number
  date: string
  note: string
  isSynced: 0 | 1
}

class HealthDB extends Dexie {
  records!: Table<HealthRecord, number>
  constructor() {
    super('healthDB')
    this.version(1).stores({
      records: '++id, date, isSynced'
    })
  }
}

const db = new HealthDB()

export default function HomePage() {
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [records, setRecords] = useState<HealthRecord[]>([])

  const saveToIndexedDB = async () => {
    await db.records.add({ date, note, isSynced: 0 })
    setDate('')
    setNote('')
    loadRecords()
  }

  const loadRecords = async () => {
    const all = await db.records.toArray()
    setRecords(all)
  }

  const syncToCloud = async () => {
    const unsynced = await db.records.where('isSynced').equals(0).toArray()
    for (const record of unsynced) {
      // 👇 模拟上传到 OneDrive
      console.log('Uploading to OneDrive:', record)
      // 这里你应该使用 OneDrive 的 Graph API 上传 JSON 数据
      await new Promise(res => setTimeout(res, 500)) // 模拟网络延迟
      await db.records.update(record.id!, { isSynced: 1 })
    }
    loadRecords()
  }

  useEffect(() => {
    loadRecords()
  }, [])

  return (
    <main className="p-4 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">健康记录输入</h1>
      <input
        type="date"
        className="border p-2 w-full"
        value={date}
        onChange={e => setDate(e.target.value)}
      />
      <textarea
        className="border p-2 w-full"
        placeholder="记录内容"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={saveToIndexedDB} className="bg-blue-500 text-white px-4 py-2 rounded">
          保存到本地
        </button>
        <button onClick={syncToCloud} className="bg-green-500 text-white px-4 py-2 rounded">
          同步到 OneDrive
        </button>
      </div>

      <h2 className="text-xl font-semibold mt-8">本地记录</h2>
      <ul className="space-y-2">
        {records.map(r => (
          <li key={r.id} className="border p-2 rounded">
            <div><strong>{r.date}</strong></div>
            <div>{r.note}</div>
            <div className={`text-sm ${r.isSynced ? 'text-green-600' : 'text-red-500'}`}>
              {r.isSynced ? '✅ 已同步' : '⚠️ 未同步'}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

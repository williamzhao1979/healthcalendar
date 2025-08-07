export interface BaseRecord {
  id: string;   // Unique identifier for the record
  userId: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
  delFlag: boolean; // Indicates if the record is deleted
}

export interface User extends BaseRecord {
  name: string;
  avatarUrl: string;
  isActive: boolean;
}
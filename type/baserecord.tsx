export interface BaseRecord {
  id: string;   // Unique identifier for the record
  userId: string;
  createdAt: string;
  updatedAt: string;
  delFlag: boolean; // Indicates if the record is deleted
}

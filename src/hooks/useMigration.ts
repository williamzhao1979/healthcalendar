"use client";

import { useState, useEffect, useCallback } from "react";
import dbService from "@/services/db";

/**
 * Migration status values
 */
export enum MigrationStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed"
}

/**
 * Custom hook that handles migration of data from localStorage to IndexedDB
 * @returns Object containing migration status, loading state, retry function and any errors
 */
export function useMigration() {
  // Migration state tracking
  const [status, setStatus] = useState<MigrationStatus>(MigrationStatus.NOT_STARTED);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationError, setMigrationError] = useState<Error | null>(null);
  const [migrationAttempts, setMigrationAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Configuration
  const MAX_MIGRATION_ATTEMPTS = 3;
  const INITIAL_DELAY_MS = 1000;
  const RETRY_DELAY_MS = 2000;

  /**
   * Attempts to migrate data from localStorage to IndexedDB
   */
  const migrateData = useCallback(async () => {
    try {
      setIsLoading(true);
      setStatus(MigrationStatus.IN_PROGRESS);
      console.log("Starting data migration...");
      
      // Ensure database is initialized first
      await dbService.initDB();
      console.log("Database initialized successfully, ready for migration");
      
      // Perform the actual data migration
      await dbService.migrateFromLocalStorage();
      
      // Mark migration as complete
      localStorage.setItem("healthCalendarMigrated", "true");
      console.log("Data migration completed successfully");
      
      // Update state
      setMigrationComplete(true);
      setMigrationError(null);
      setStatus(MigrationStatus.COMPLETED);
    } catch (error) {
      console.error("Error during data migration process:", error);
      setMigrationError(error instanceof Error ? error : new Error(String(error)));
      setMigrationAttempts(prev => prev + 1);
      setStatus(MigrationStatus.FAILED);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Manual retry function that can be exposed to components
   */
  const retryMigration = useCallback(() => {
    if (isLoading) {
      console.log("Migration already in progress, ignoring retry request");
      return;
    }
    
    console.log("Manually triggering migration retry...");
    setMigrationAttempts(0);
    setMigrationError(null);
    migrateData();
  }, [isLoading, migrateData]);

  // Initial migration attempt
  useEffect(() => {
    console.log("useMigration hook initialized");
    
    // Check if migration has already been performed
    const migrated = localStorage.getItem("healthCalendarMigrated");
    
    if (migrated === "true") {
      console.log("Data already migrated, skipping migration");
      setMigrationComplete(true);
      setStatus(MigrationStatus.COMPLETED);
      return;
    }
    
    // Start migration process with a slight delay to ensure DB is initialized
    console.log(`Scheduling migration to start in ${INITIAL_DELAY_MS}ms...`);
    const timeoutId = setTimeout(() => {
      migrateData();
    }, INITIAL_DELAY_MS);
    
    return () => {
      console.log("Cleaning up migration timer");
      clearTimeout(timeoutId);
    };
  }, [migrateData]);
  
  // Handle automatic retry logic when migration fails
  useEffect(() => {
    if (migrationError && migrationAttempts < MAX_MIGRATION_ATTEMPTS) {
      console.log(`Scheduling retry ${migrationAttempts + 1}/${MAX_MIGRATION_ATTEMPTS} in ${RETRY_DELAY_MS}ms...`);
      
      const retryTimeoutId = setTimeout(() => {
        console.log(`Retrying data migration (attempt ${migrationAttempts + 1}/${MAX_MIGRATION_ATTEMPTS})...`);
        migrateData();
      }, RETRY_DELAY_MS); 
      
      return () => {
        console.log("Cleaning up retry timer");
        clearTimeout(retryTimeoutId);
      };
    } else if (migrationError && migrationAttempts >= MAX_MIGRATION_ATTEMPTS) {
      console.error(`Migration failed after ${MAX_MIGRATION_ATTEMPTS} attempts. Manual retry required.`);
    }
  }, [migrationError, migrationAttempts, migrateData, MAX_MIGRATION_ATTEMPTS]);

  return { 
    migrationComplete, 
    migrationError, 
    isLoading, 
    status,
    retryMigration,
    migrationAttempts,
    maxAttempts: MAX_MIGRATION_ATTEMPTS
  };
}

/**
 * Data Provider Interface
 * 
 * Abstracts data storage/retrieval so BlueTag can work:
 * - Standalone: Uses localStorage
 * - Integrated: Uses Cascade Connect database
 */

import { ProjectDetails, LocationGroup } from '../types';

export interface IDataProvider {
  /**
   * Load project and locations data
   * @param reportId Unique identifier for the report (e.g., homeowner ID)
   * @returns Project and locations data, or null if not found
   */
  loadReport(reportId: string): Promise<{ project: ProjectDetails; locations: LocationGroup[] } | null>;

  /**
   * Save project and locations data
   * @param reportId Unique identifier for the report
   * @param project Project details
   * @param locations Location groups
   */
  saveReport(reportId: string, project: ProjectDetails, locations: LocationGroup[]): Promise<void>;

  /**
   * Delete a report
   * @param reportId Unique identifier for the report
   */
  deleteReport(reportId: string): Promise<void>;
}

/**
 * LocalStorage Data Provider (for standalone app)
 */
export class LocalStorageDataProvider implements IDataProvider {
  private getReportKey(reportId: string): string {
    return `bluetag_report_${reportId}`;
  }

  async loadReport(reportId: string): Promise<{ project: ProjectDetails; locations: LocationGroup[] } | null> {
    try {
      const reportKey = this.getReportKey(reportId);
      const savedReport = localStorage.getItem(reportKey);
      
      if (savedReport) {
        const reportData = JSON.parse(savedReport);
        return {
          project: reportData.project,
          locations: reportData.locations || []
        };
      }
      return null;
    } catch (error) {
      console.error('Error loading report from localStorage:', error);
      return null;
    }
  }

  async saveReport(reportId: string, project: ProjectDetails, locations: LocationGroup[]): Promise<void> {
    try {
      const reportKey = this.getReportKey(reportId);
      const reportData = {
        project,
        locations,
        lastModified: Date.now()
      };
      localStorage.setItem(reportKey, JSON.stringify(reportData));
    } catch (error) {
      console.error('Error saving report to localStorage:', error);
      throw error;
    }
  }

  async deleteReport(reportId: string): Promise<void> {
    try {
      const reportKey = this.getReportKey(reportId);
      localStorage.removeItem(reportKey);
    } catch (error) {
      console.error('Error deleting report from localStorage:', error);
      throw error;
    }
  }
}

/**
 * Database Data Provider (for Cascade Connect integration)
 * Uses the Cascade Connect database to store BlueTag reports
 */
export class DatabaseDataProvider implements IDataProvider {
  private db: any; // Drizzle database instance
  private bluetagReportsTable: any; // bluetagReports table from schema

  constructor(db: any, bluetagReportsTable: any) {
    this.db = db;
    this.bluetagReportsTable = bluetagReportsTable;
  }

  async loadReport(reportId: string): Promise<{ project: ProjectDetails; locations: LocationGroup[] } | null> {
    try {
      const { eq } = await import('drizzle-orm');
      const result = await this.db
        .select()
        .from(this.bluetagReportsTable)
        .where(eq(this.bluetagReportsTable.homeownerId, reportId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const report = result[0];
      return {
        project: report.project as ProjectDetails,
        locations: (report.locations || []) as LocationGroup[]
      };
    } catch (error) {
      console.error('Error loading report from database:', error);
      // Fallback to null if database error (allows creating new report)
      return null;
    }
  }

  async saveReport(reportId: string, project: ProjectDetails, locations: LocationGroup[]): Promise<void> {
    try {
      const { eq } = await import('drizzle-orm');
      
      // Check if report exists
      const existing = await this.db
        .select()
        .from(this.bluetagReportsTable)
        .where(eq(this.bluetagReportsTable.homeownerId, reportId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing report
        await this.db
          .update(this.bluetagReportsTable)
          .set({
            project: project,
            locations: locations,
            lastModified: new Date()
          })
          .where(eq(this.bluetagReportsTable.homeownerId, reportId));
      } else {
        // Insert new report
        await this.db
          .insert(this.bluetagReportsTable)
          .values({
            homeownerId: reportId,
            project: project,
            locations: locations,
            lastModified: new Date(),
            createdAt: new Date()
          });
      }
    } catch (error) {
      console.error('Error saving report to database:', error);
      throw error;
    }
  }

  async deleteReport(reportId: string): Promise<void> {
    try {
      const { eq } = await import('drizzle-orm');
      await this.db
        .delete(this.bluetagReportsTable)
        .where(eq(this.bluetagReportsTable.homeownerId, reportId));
    } catch (error) {
      console.error('Error deleting report from database:', error);
      throw error;
    }
  }
}

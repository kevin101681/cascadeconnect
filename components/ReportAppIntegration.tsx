import React, { useState, useEffect } from 'react';
import { Homeowner } from '../types';
import { createReportAppUser, updateReportAppUser, checkReportAppLink, getReportAppLink, SyncResponse } from '../services/reportAppSync';
import { ExternalLink, Link2, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import Button from './Button';

interface ReportAppIntegrationProps {
  homeowner: Homeowner;
  onUpdateHomeowner: (homeowner: Homeowner) => void;
}

const ReportAppIntegration: React.FC<ReportAppIntegrationProps> = ({ homeowner, onUpdateHomeowner }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    linked: boolean;
    userId?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    checkLinkStatus();
  }, [homeowner.id]);

  const checkLinkStatus = async () => {
    setIsChecking(true);
    try {
      // First check if we have stored link info
      if (homeowner.reportAppLinked && homeowner.reportAppUserId) {
        setSyncStatus({
          linked: true,
          userId: homeowner.reportAppUserId,
        });
      } else {
        // Check with the API
        const result = await checkReportAppLink(homeowner.id);
        setSyncStatus(result);
        
        // Update homeowner if we found a link
        if (result.linked && result.userId) {
          onUpdateHomeowner({
            ...homeowner,
            reportAppLinked: true,
            reportAppUserId: result.userId,
            reportAppLinkedAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error checking link status:', error);
      setSyncStatus({
        linked: false,
        error: 'Failed to check link status',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleLinkHomeowner = async () => {
    setIsLinking(true);
    setSyncStatus(null);

    try {
      const result: SyncResponse = await createReportAppUser(homeowner);

      if (result.success && result.userId) {
        // Update homeowner with link info
        const updatedHomeowner: Homeowner = {
          ...homeowner,
          reportAppLinked: true,
          reportAppUserId: result.userId,
          reportAppLinkedAt: new Date(),
        };
        
        onUpdateHomeowner(updatedHomeowner);
        setSyncStatus({
          linked: true,
          userId: result.userId,
        });
      } else {
        setSyncStatus({
          linked: false,
          error: result.error || 'Failed to create user in PDF Reports App',
        });
      }
    } catch (error) {
      console.error('Error linking homeowner:', error);
      setSyncStatus({
        linked: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleSyncUpdate = async () => {
    if (!homeowner.reportAppUserId) return;

    setIsLinking(true);
    try {
      const result: SyncResponse = await updateReportAppUser(homeowner, homeowner.reportAppUserId);

      if (result.success) {
        setSyncStatus({
          linked: true,
          userId: homeowner.reportAppUserId,
        });
      } else {
        setSyncStatus({
          linked: true,
          userId: homeowner.reportAppUserId,
          error: result.error || 'Failed to update user',
        });
      }
    } catch (error) {
      console.error('Error syncing update:', error);
      setSyncStatus({
        linked: true,
        userId: homeowner.reportAppUserId,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleOpenReports = () => {
    const link = getReportAppLink(homeowner.id, homeowner.reportAppUserId);
    window.open(link, '_blank');
  };

  const isLinked = syncStatus?.linked || homeowner.reportAppLinked;

  return (
    <div className="bg-surface-container p-6 rounded-3xl border border-surface-outline-variant">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-container text-primary-on-container rounded-lg">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-surface-on">PDF Reports App Integration</h3>
            <p className="text-sm text-surface-on-variant">
              Link this homeowner to the PDF Reports App
            </p>
          </div>
        </div>
      </div>

      {isChecking ? (
        <div className="flex items-center gap-2 text-surface-on-variant">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking link status...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status Display */}
          {isLinked ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  Linked to PDF Reports App
                </p>
                {homeowner.reportAppLinkedAt && (
                  <p className="text-xs text-green-700 mt-1">
                    Linked on {new Date(homeowner.reportAppLinkedAt).toLocaleDateString()}
                  </p>
                )}
                {syncStatus?.error && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {syncStatus.error}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <XCircle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  Not linked to PDF Reports App
                </p>
                {syncStatus?.error && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {syncStatus.error}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!isLinked ? (
              <Button
                variant="filled"
                onClick={handleLinkHomeowner}
                disabled={isLinking}
                icon={isLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              >
                {isLinking ? 'Linking...' : 'Link to PDF Reports App'}
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  onClick={handleSyncUpdate}
                  disabled={isLinking}
                  icon={isLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                >
                  {isLinking ? 'Syncing...' : 'Sync Update'}
                </Button>
                <Button
                  variant="tonal"
                  onClick={handleOpenReports}
                  icon={<ExternalLink className="h-4 w-4" />}
                >
                  Open Reports
                </Button>
              </>
            )}
          </div>

          {/* Info */}
          <div className="text-xs text-surface-on-variant bg-surface-container/50 p-3 rounded-lg">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Linking creates a user account in the PDF Reports App</li>
              <li>The homeowner can access their PDF reports using the same email</li>
              <li>Use "Sync Update" to update the linked account when homeowner info changes</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportAppIntegration;







import React, { useState, useMemo } from 'react';
import { Claim, Homeowner, BuilderGroup, ClaimStatus } from '../types';
import { ClaimMessage } from '../constants';
import { BarChart3, Users, FileText, CheckCircle, Clock, TrendingUp, AlertCircle, Filter, X } from 'lucide-react';

interface WarrantyAnalyticsProps {
  claims: Claim[];
  homeowners: Homeowner[];
  builderGroups: BuilderGroup[];
  claimMessages: ClaimMessage[];
  onSelectClaim: (claim: Claim) => void;
  onClose?: () => void;
}

// Helper function to calculate business days (excluding weekends)
const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

const WarrantyAnalytics: React.FC<WarrantyAnalyticsProps> = ({
  claims,
  homeowners,
  builderGroups,
  claimMessages,
  onSelectClaim,
  onClose
}) => {
  const [selectedBuilderGroupId, setSelectedBuilderGroupId] = useState<string>('all');
  const [showInProcessReport, setShowInProcessReport] = useState(false);
  const [showAllClaimsReport, setShowAllClaimsReport] = useState(false);

  // Filter data by builder group
  const filteredData = useMemo(() => {
    let filteredHomeowners = homeowners;
    let filteredClaims = claims;

    if (selectedBuilderGroupId !== 'all') {
      filteredHomeowners = homeowners.filter(h => h.builderId === selectedBuilderGroupId);
      filteredClaims = claims.filter(c => {
        const homeowner = homeowners.find(h => h.name === c.homeownerName && h.address === c.address);
        return homeowner?.builderId === selectedBuilderGroupId;
      });
    }

    return { homeowners: filteredHomeowners, claims: filteredClaims };
  }, [homeowners, claims, selectedBuilderGroupId]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const { homeowners: filteredHomeowners, claims: filteredClaims } = filteredData;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // 1. Active homeowners: within one year of closing
    const activeHomeowners = filteredHomeowners.filter(h => {
      const closingDate = new Date(h.closingDate);
      return closingDate >= oneYearAgo;
    }).length;

    // 2. Claimants: homeowners who have submitted claims
    const claimantIds = new Set(filteredClaims.map(c => {
      const homeowner = filteredHomeowners.find(h => 
        h.name === c.homeownerName && h.address === c.address
      );
      return homeowner?.id;
    }).filter(Boolean));
    const claimants = claimantIds.size;

    // 3. Approved claims: open, not new (not SUBMITTED), classification assigned
    const approvedClaims = filteredClaims.filter(c => {
      const isOpen = c.status !== ClaimStatus.COMPLETED;
      const isNotNew = c.status !== ClaimStatus.SUBMITTED;
      const hasClassification = c.classification && c.classification !== 'Unclassified';
      return isOpen && isNotNew && hasClassification;
    });
    const approvedClaimants = new Set(approvedClaims.map(c => {
      const homeowner = filteredHomeowners.find(h => 
        h.name === c.homeownerName && h.address === c.address
      );
      return homeowner?.id;
    }).filter(Boolean)).size;

    // 4. CBS Cycle Time: from dateEvaluated to first SUBCONTRACTOR message
    const cbsCycleTimes: number[] = [];
    filteredClaims.forEach(claim => {
      if (claim.dateEvaluated) {
        const subMessages = claimMessages
          .filter(m => m.claimId === claim.id && m.type === 'SUBCONTRACTOR')
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        if (subMessages.length > 0) {
          const firstSubMessageDate = new Date(subMessages[0].timestamp);
          const businessDays = calculateBusinessDays(
            new Date(claim.dateEvaluated),
            firstSubMessageDate
          );
          if (businessDays >= 0) {
            cbsCycleTimes.push(businessDays);
          }
        }
      }
    });
    const avgCbsCycleTime = cbsCycleTimes.length > 0
      ? Math.round(cbsCycleTimes.reduce((a, b) => a + b, 0) / cbsCycleTimes.length)
      : 0;

    // 5. Contractor Cycle Time: from first SUBCONTRACTOR message to COMPLETED
    const contractorCycleTimes: number[] = [];
    filteredClaims.forEach(claim => {
      if (claim.status === ClaimStatus.COMPLETED) {
        const subMessages = claimMessages
          .filter(m => m.claimId === claim.id && m.type === 'SUBCONTRACTOR')
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        if (subMessages.length > 0) {
          const firstSubMessageDate = new Date(subMessages[0].timestamp);
          // Find when claim was completed
          // Use last comment timestamp if available (most accurate), otherwise use last proposed date
          let completedDate: Date;
          if (claim.comments && claim.comments.length > 0) {
            const lastComment = claim.comments[claim.comments.length - 1];
            completedDate = new Date(lastComment.timestamp);
          } else if (claim.proposedDates.length > 0) {
            completedDate = new Date(claim.proposedDates[claim.proposedDates.length - 1].date);
          } else {
            // Fallback to dateEvaluated or dateSubmitted
            completedDate = new Date(claim.dateEvaluated || claim.dateSubmitted);
          }
          
          const businessDays = calculateBusinessDays(firstSubMessageDate, completedDate);
          if (businessDays >= 0) {
            contractorCycleTimes.push(businessDays);
          }
        }
      }
    });
    const avgContractorCycleTime = contractorCycleTimes.length > 0
      ? Math.round(contractorCycleTimes.reduce((a, b) => a + b, 0) / contractorCycleTimes.length)
      : 0;

    // 6. Cycle Time Ratio
    const avgCycleTime = (avgCbsCycleTime + avgContractorCycleTime) / 2;
    const cbsPercentage = avgCycleTime > 0
      ? Math.round((avgCbsCycleTime / avgCycleTime) * 100)
      : 50;
    const contractorPercentage = 100 - cbsPercentage;

    return {
      activeHomeowners,
      claimants,
      approvedClaimants,
      avgCbsCycleTime,
      avgContractorCycleTime,
      avgCycleTime,
      cbsPercentage,
      contractorPercentage
    };
  }, [filteredData, claimMessages]);

  // Get "Needs Attention" claims
  const needsAttentionClaims = useMemo(() => {
    return filteredData.claims.filter(c => c.classification === 'Needs Attention');
  }, [filteredData]);

  // Get "In Process and New" claims
  const inProcessAndNewClaims = useMemo(() => {
    return filteredData.claims.filter(c => {
      const isInProcess = c.status === ClaimStatus.SCHEDULING || c.status === ClaimStatus.SCHEDULED;
      const isNew = c.status === ClaimStatus.SUBMITTED;
      return isInProcess || isNew;
    });
  }, [filteredData]);

  // Get all open and closed claims
  const allClaims = useMemo(() => {
    return filteredData.claims;
  }, [filteredData]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]">
      <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8">
        <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Warranty Analytics
            </h3>
            <p className="text-sm text-surface-on-variant dark:text-gray-400">Warranty claim metrics and performance analytics</p>
          </div>
          <button 
            onClick={onClose || (() => {})} 
            className="p-2.5 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="space-y-6">
        {/* Header with Builder Group Filter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
            <select
              value={selectedBuilderGroupId}
              onChange={(e) => setSelectedBuilderGroupId(e.target.value)}
              className="px-4 py-2 rounded-lg border border-surface-outline-variant dark:border-gray-600 bg-surface dark:bg-gray-800 text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Builder Groups</option>
              {builderGroups.map(bg => (
                <option key={bg.id} value={bg.id}>{bg.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Active Homeowners */}
          <div className="bg-surface dark:bg-gray-800 rounded-xl p-6 shadow-elevation-1 border border-surface-outline-variant dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-surface-on-variant dark:text-gray-400">Active Homeowners</h3>
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-normal text-surface-on dark:text-gray-100">{metrics.activeHomeowners}</p>
            <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-2">
              Closing within last 12 months
            </p>
          </div>

          {/* Claimants */}
          <div className="bg-surface dark:bg-gray-800 rounded-xl p-6 shadow-elevation-1 border border-surface-outline-variant dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-surface-on-variant dark:text-gray-400">Claimants</h3>
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-normal text-surface-on dark:text-gray-100">{metrics.claimants}</p>
            <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-2">
              Homeowners who submitted claims
            </p>
          </div>

          {/* Approved Claimants */}
          <div className="bg-surface dark:bg-gray-800 rounded-xl p-6 shadow-elevation-1 border border-surface-outline-variant dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-surface-on-variant dark:text-gray-400">Approved Claimants</h3>
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-normal text-surface-on dark:text-gray-100">{metrics.approvedClaimants}</p>
            <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-2">
              Open claims with classification
            </p>
          </div>

          {/* CBS Cycle Time */}
          <div className="bg-surface dark:bg-gray-800 rounded-xl p-6 shadow-elevation-1 border border-surface-outline-variant dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-surface-on-variant dark:text-gray-400">CBS Cycle Time</h3>
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-normal text-surface-on dark:text-gray-100">{metrics.avgCbsCycleTime}</p>
            <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-2">
              Avg. business days (acceptance to service order)
            </p>
          </div>

          {/* Contractor Cycle Time */}
          <div className="bg-surface dark:bg-gray-800 rounded-xl p-6 shadow-elevation-1 border border-surface-outline-variant dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-surface-on-variant dark:text-gray-400">Contractor Cycle Time</h3>
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-normal text-surface-on dark:text-gray-100">{metrics.avgContractorCycleTime}</p>
            <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-2">
              Avg. business days (service order to completion)
            </p>
          </div>

          {/* Cycle Time Ratio */}
          <div className="bg-surface dark:bg-gray-800 rounded-xl p-6 shadow-elevation-1 border border-surface-outline-variant dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-surface-on-variant dark:text-gray-400">Cycle Time Ratio</h3>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-normal text-surface-on dark:text-gray-100">{Math.round(metrics.avgCycleTime)}</p>
            <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-2 mb-3">
              Average cycle time
            </p>
            <div className="w-full bg-surface-container dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="flex h-full">
                <div
                  className="bg-primary"
                  style={{ width: `${metrics.cbsPercentage}%` }}
                  title={`CBS: ${metrics.cbsPercentage}%`}
                />
                <div
                  className="bg-primary/60"
                  style={{ width: `${metrics.contractorPercentage}%` }}
                  title={`Contractor: ${metrics.contractorPercentage}%`}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-surface-on-variant dark:text-gray-400 mt-2">
              <span>CBS: {metrics.cbsPercentage}%</span>
              <span>Contractor: {metrics.contractorPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Detailed Reports Section */}
        <div className="bg-surface dark:bg-gray-800 rounded-xl p-6 shadow-elevation-1 border border-surface-outline-variant dark:border-gray-700">
          <h2 className="text-xl font-normal text-surface-on dark:text-gray-100 mb-6">Detailed Reports</h2>

          {/* Needs Attention Section */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-error" />
            Needs Attention
          </h3>
          {needsAttentionClaims.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-outline-variant dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-surface-on-variant dark:text-gray-400">Homeowner</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-surface-on-variant dark:text-gray-400">Claim Title</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-surface-on-variant dark:text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-surface-on-variant dark:text-gray-400">Date Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {needsAttentionClaims.map(claim => (
                    <tr
                      key={claim.id}
                      className="border-b border-surface-outline-variant/50 dark:border-gray-700/50 hover:bg-error/5 dark:hover:bg-error/10 cursor-pointer bg-error/5 dark:bg-error/10"
                      onClick={() => onSelectClaim(claim)}
                    >
                      <td className="py-3 px-4 text-sm text-surface-on dark:text-gray-100">{claim.homeownerName}</td>
                      <td className="py-3 px-4 text-sm text-surface-on dark:text-gray-100">{claim.title}</td>
                      <td className="py-3 px-4 text-sm text-surface-on dark:text-gray-100">{claim.status}</td>
                      <td className="py-3 px-4 text-sm text-surface-on dark:text-gray-100">
                        {new Date(claim.dateSubmitted).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-surface-on-variant dark:text-gray-400">No claims require attention at this time.</p>
          )}
          </div>

          {/* Report Links */}
          <div className="space-y-4">
          <button
            onClick={() => setShowInProcessReport(!showInProcessReport)}
            className="w-full text-left px-4 py-3 rounded-lg bg-surface-container dark:bg-gray-700 hover:bg-surface-container-high dark:hover:bg-gray-600 transition-colors text-surface-on dark:text-gray-100"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">In Process and New</span>
              <span className="text-sm text-surface-on-variant dark:text-gray-400">
                {inProcessAndNewClaims.length} claims
              </span>
            </div>
          </button>

          {showInProcessReport && (
            <div className="mt-4 overflow-x-auto bg-surface-container/50 dark:bg-gray-700/50 rounded-lg p-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-outline-variant dark:border-gray-700">
                    <th className="text-left py-2 px-4 text-xs font-medium text-surface-on-variant dark:text-gray-400">Homeowner</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-surface-on-variant dark:text-gray-400">Claim Title</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-surface-on-variant dark:text-gray-400">Status</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-surface-on-variant dark:text-gray-400">Date Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {inProcessAndNewClaims.map(claim => (
                    <tr
                      key={claim.id}
                      className="border-b border-surface-outline-variant/50 dark:border-gray-700/50 hover:bg-surface-container dark:hover:bg-gray-600 cursor-pointer"
                      onClick={() => onSelectClaim(claim)}
                    >
                      <td className="py-2 px-4 text-xs text-surface-on dark:text-gray-100">{claim.homeownerName}</td>
                      <td className="py-2 px-4 text-xs text-surface-on dark:text-gray-100">{claim.title}</td>
                      <td className="py-2 px-4 text-xs text-surface-on dark:text-gray-100">{claim.status}</td>
                      <td className="py-2 px-4 text-xs text-surface-on dark:text-gray-100">
                        {new Date(claim.dateSubmitted).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={() => setShowAllClaimsReport(!showAllClaimsReport)}
            className="w-full text-left px-4 py-3 rounded-lg bg-surface-container dark:bg-gray-700 hover:bg-surface-container-high dark:hover:bg-gray-600 transition-colors text-surface-on dark:text-gray-100"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">All Open and Closed Claims</span>
              <span className="text-sm text-surface-on-variant dark:text-gray-400">
                {allClaims.length} claims
              </span>
            </div>
          </button>

          {showAllClaimsReport && (
            <div className="mt-4 overflow-x-auto bg-surface-container/50 dark:bg-gray-700/50 rounded-lg p-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-outline-variant dark:border-gray-700">
                    <th className="text-left py-2 px-4 text-xs font-medium text-surface-on-variant dark:text-gray-400">Homeowner</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-surface-on-variant dark:text-gray-400">Claim Title</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-surface-on-variant dark:text-gray-400">Status</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-surface-on-variant dark:text-gray-400">Classification</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-surface-on-variant dark:text-gray-400">Date Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {allClaims.map(claim => (
                    <tr
                      key={claim.id}
                      className="border-b border-surface-outline-variant/50 dark:border-gray-700/50 hover:bg-surface-container dark:hover:bg-gray-600 cursor-pointer"
                      onClick={() => onSelectClaim(claim)}
                    >
                      <td className="py-2 px-4 text-xs text-surface-on dark:text-gray-100">{claim.homeownerName}</td>
                      <td className="py-2 px-4 text-xs text-surface-on dark:text-gray-100">{claim.title}</td>
                      <td className="py-2 px-4 text-xs text-surface-on dark:text-gray-100">{claim.status}</td>
                      <td className="py-2 px-4 text-xs text-surface-on dark:text-gray-100">{claim.classification}</td>
                      <td className="py-2 px-4 text-xs text-surface-on dark:text-gray-100">
                        {new Date(claim.dateSubmitted).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarrantyAnalytics;


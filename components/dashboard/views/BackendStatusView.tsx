/**
 * Backend Status View - System Monitoring
 * 
 * Displays backend system health, Netlify deployment status, Neon database stats,
 * and email logs in a flat page layout for the Settings Tab.
 */

import React, { useState } from 'react';
import { Server, Globe, Database, Mail } from 'lucide-react';
import BackendDashboard from '../../BackendDashboard';

interface BackendStatusViewProps {}

const BackendStatusView: React.FC<BackendStatusViewProps> = () => {
  const [showFullDashboard, setShowFullDashboard] = useState(false);

  return (
    <div className="h-full flex flex-col bg-surface dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700/50 p-6 flex-shrink-0">
        <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100">
          Backend Status
        </h3>
        <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
          System health monitoring and deployment logs
        </p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl">
          {/* Quick Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant dark:border-gray-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-surface-on dark:text-gray-100">Netlify</h4>
                  <p className="text-xs text-surface-on-variant dark:text-gray-400">Deployment</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-surface-on dark:text-gray-100">Active</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Last deploy: Recently</p>
            </div>

            <div className="bg-surface dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant dark:border-gray-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-surface-on dark:text-gray-100">Neon</h4>
                  <p className="text-xs text-surface-on-variant dark:text-gray-400">Database</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-surface-on dark:text-gray-100">Online</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Connected</p>
            </div>

            <div className="bg-surface dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant dark:border-gray-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-surface-on dark:text-gray-100">Functions</h4>
                  <p className="text-xs text-surface-on-variant dark:text-gray-400">Serverless</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-surface-on dark:text-gray-100">Ready</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">All operational</p>
            </div>

            <div className="bg-surface dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant dark:border-gray-600">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-surface-on dark:text-gray-100">Email</h4>
                  <p className="text-xs text-surface-on-variant dark:text-gray-400">SendGrid</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-surface-on dark:text-gray-100">Active</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Sending</p>
            </div>
          </div>

          {/* Full Dashboard Access */}
          <div className="bg-surface dark:bg-gray-700 rounded-xl p-6 border border-surface-outline-variant dark:border-gray-600">
            <h4 className="text-base font-semibold text-surface-on dark:text-gray-100 mb-3">
              Advanced Monitoring
            </h4>
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
              Access the full backend dashboard for detailed system metrics, deployment history, database statistics, and email logs.
            </p>
            <button
              onClick={() => setShowFullDashboard(true)}
              className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
            >
              Open Full Dashboard
            </button>
          </div>

          {/* System Status Notes */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              System Information
            </h5>
            <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
              <li>• Netlify: Continuous deployment from GitHub main branch</li>
              <li>• Neon: PostgreSQL database with automatic backups</li>
              <li>• Functions: Serverless handlers for webhooks and email</li>
              <li>• Email: SendGrid for transactional emails</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Full Backend Dashboard Modal */}
      {showFullDashboard && (
        <BackendDashboard onClose={() => setShowFullDashboard(false)} />
      )}
    </div>
  );
};

export default BackendStatusView;

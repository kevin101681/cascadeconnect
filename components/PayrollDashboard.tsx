import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Download,
  TrendingUp,
  Loader2,
  Building2,
  CreditCard
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import GustoConnectButton from './integrations/gusto-connect-button';

interface Payment {
  id?: string;
  payroll_id?: string;
  payment_id?: string;
  company_debit?: {
    amount: number;
    currency: string;
  };
  debit_date?: string;
  pay_period?: {
    start_date?: string;
    end_date?: string;
  };
  pay_periods?: {
    start_date?: string;
    end_date?: string;
  };
  pay_date?: string;
  check_date?: string;
  employee_count?: number;
}

const PayrollDashboard: React.FC = () => {
  const { user, isLoaded } = useUser();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGustoConnected, setIsGustoConnected] = useState(false);
  const [gustoData, setGustoData] = useState<{ isConnected: boolean; payrolls: any[] } | null>(null);

  useEffect(() => {
    const checkGustoStatus = async () => {
      if (!isLoaded || !user?.id) return;
      try {
        const res = await fetch(`/.netlify/functions/gusto-status?userId=${encodeURIComponent(user.id)}`);
        const json = await res.json();
        setIsGustoConnected(!!json.isConnected);
      } catch (err) {
        console.warn('Failed to load Gusto status', err);
        setIsGustoConnected(false);
      }
    };
    checkGustoStatus();
  }, [isLoaded, user?.id]);

  useEffect(() => {
    const fetchGustoData = async () => {
      if (!isLoaded || !user?.id) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/.netlify/functions/gusto-payrolls?userId=${encodeURIComponent(user.id)}`);
        const data = await res.json();
        console.log('Gusto Data:', data);
        setGustoData(data);
        if (data?.isConnected) {
          setIsGustoConnected(true);
          if (Array.isArray(data.payrolls)) {
            setPayments(data.payrolls as Payment[]);
          }
        } else {
          setPayments([]);
        }
      } catch (err) {
        console.error('Fetch failed', err);
        setError('Failed to load Gusto payrolls');
      } finally {
        setIsLoading(false);
      }
    };
    fetchGustoData();
  }, [isLoaded, user?.id]);

  // Calculate KPIs from live data
  const kpis = useMemo(() => {
    const totalPayrolls = payments.length;
    const lastRun =
      payments[0]?.check_date ||
      payments[0]?.pay_date ||
      payments[0]?.pay_period?.end_date ||
      payments[0]?.pay_periods?.end_date ||
      'N/A';

    return {
      totalPayrolls,
      lastRun,
    };
  }, [payments]);

  const togglePaymentDetails = (paymentId: string) => {
    setExpandedPayment(expandedPayment === paymentId ? null : paymentId);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-surface-on-variant dark:text-gray-400">Loading payroll data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white md:rounded-3xl md:border border-surface-outline-variant dark:border-gray-700 flex flex-col">
      {/* Header - COMPACT & STANDARDIZED */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-surface-outline-variant dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 md:rounded-t-3xl">
        <h2 className="text-xl font-semibold text-surface-on dark:text-gray-100">
          Payroll Dashboard
        </h2>
        <div className="flex items-center gap-3">
          <GustoConnectButton isConnected={isGustoConnected} />
          <button 
            style={{
              height: '36px',
              padding: '0 16px',
              backgroundColor: "white",
              color: "#3c6b80",
              border: "2px solid #3c6b80",
              borderRadius: "9999px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.875rem",
              fontWeight: "500"
            }}
            className="hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

       {/* KPI Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Connection Status */}
         <div className="bg-surface dark:bg-gray-800 rounded-xl border border-surface-outline-variant dark:border-gray-700 p-6">
           <div className="flex items-center justify-between mb-4">
             <div className="p-3 bg-green-100 rounded-lg">
               <DollarSign className="h-6 w-6 text-green-700" />
             </div>
           </div>
           <h3 className="text-surface-on-variant dark:text-gray-400 text-sm font-medium">
             Connection
           </h3>
           <p className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full mt-2 ${
             isGustoConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
           }`}>
             {isGustoConnected ? 'Active' : 'Disconnected'}
           </p>
         </div>

         {/* Total Payrolls */}
         <div className="bg-surface dark:bg-gray-800 rounded-xl border border-surface-outline-variant dark:border-gray-700 p-6">
           <div className="flex items-center justify-between mb-4">
             <div className="p-3 bg-primary-container dark:bg-primary/20 rounded-lg">
               <Users className="h-6 w-6 text-primary" />
             </div>
           </div>
           <h3 className="text-surface-on-variant dark:text-gray-400 text-sm font-medium">
             Total Payrolls
           </h3>
           <p className="text-3xl font-bold text-surface-on dark:text-gray-100 mt-2">
             {kpis.totalPayrolls}
           </p>
         </div>

         {/* Last Run */}
         <div className="bg-surface dark:bg-gray-800 rounded-xl border border-surface-outline-variant dark:border-gray-700 p-6">
           <div className="flex items-center justify-between mb-4">
             <div className="p-3 bg-tertiary-container dark:bg-tertiary/20 rounded-lg">
               <Calendar className="h-6 w-6 text-tertiary dark:text-tertiary-container" />
             </div>
           </div>
           <h3 className="text-surface-on-variant dark:text-gray-400 text-sm font-medium">
             Last Run
           </h3>
           <p className="text-3xl font-bold text-surface-on dark:text-gray-100 mt-2">
             {kpis.lastRun || 'N/A'}
           </p>
         </div>
       </div>

      {/* Recent Payrolls Table */}
      <div className="bg-surface dark:bg-gray-800 rounded-xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-outline-variant dark:border-gray-700">
          <h2 className="text-xl font-semibold text-surface-on dark:text-gray-100">
            Recent Payrolls
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-container dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">
                  Payment ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">
                  Pay Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">
                  Pay Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">
                  Employees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-on-variant dark:text-gray-400 uppercase tracking-wider">
                  
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-700">
               {payments.map((payment, idx) => {
                 const id = payment.payment_id || payment.payroll_id || payment.id || `pay_${idx}`;
                 const payPeriod = payment.pay_period || payment.pay_periods || {};
                 const payDate = payment.pay_date || payment.check_date;
                 return (
                 <React.Fragment key={id}>
                  <tr 
                    className="hover:bg-surface-container/50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                     onClick={() => togglePaymentDetails(id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                        <span className="text-sm font-mono text-surface-on dark:text-gray-100">
                           {id.toString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-surface-on dark:text-gray-100">
                         {payPeriod.start_date
                           ? new Date(payPeriod.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                           : '—'}
                         {' - '}
                         {payPeriod.end_date
                           ? new Date(payPeriod.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                           : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-on dark:text-gray-100">
                       {payDate
                         ? new Date(payDate).toLocaleDateString('en-US', { 
                             month: 'short', 
                             day: 'numeric', 
                             year: 'numeric' 
                           })
                         : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                        <span className="text-sm text-surface-on dark:text-gray-100">
                           {payment.employee_count ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-surface-on dark:text-gray-100">
                         {payment.company_debit?.amount !== undefined
                           ? new Intl.NumberFormat('en-US', { style: 'currency', currency: payment.company_debit.currency || 'USD' }).format(payment.company_debit.amount)
                           : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                       {expandedPayment === id ? (
                        <ChevronUp className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
                      )}
                    </td>
                  </tr>
                 </React.Fragment>
               );
               })}
            </tbody>
          </table>
        </div>
      </div>

      </div>
    </div>
  );
};

export default PayrollDashboard;


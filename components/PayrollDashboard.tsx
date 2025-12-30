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

// Finch API Type Definitions (matching actual Finch response structure)
interface PayPeriod {
  start_date: string;
  end_date: string;
}

interface Payment {
  payment_id: string;
  company_debit: {
    amount: number;
    currency: string;
  };
  debit_date: string;
  pay_period: PayPeriod;
  pay_date: string;
  employee_count: number;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department: {
    name: string;
  } | null;
  employment: {
    type: string;
    subtype: string;
  };
  is_active: boolean;
}

interface PayStatement {
  payment_id: string;
  individual_id: string;
  type: string;
  gross_pay: {
    amount: number;
    currency: string;
  };
  net_pay: {
    amount: number;
    currency: string;
  };
  earnings: Array<{
    name: string;
    amount: number;
    currency: string;
    type: string;
  }>;
  taxes: Array<{
    name: string;
    amount: number;
    currency: string;
    type: string;
  }>;
  employee_deductions: Array<{
    name: string;
    amount: number;
    currency: string;
    type: string;
  }>;
}

// Mock Data - Replace with actual Finch API calls
const MOCK_PAYMENTS: Payment[] = [
  {
    payment_id: "pay_2024_01_15_001",
    company_debit: {
      amount: 125430.50,
      currency: "usd"
    },
    debit_date: "2024-01-15",
    pay_period: {
      start_date: "2024-01-01",
      end_date: "2024-01-15"
    },
    pay_date: "2024-01-15",
    employee_count: 12
  },
  {
    payment_id: "pay_2024_01_01_001",
    company_debit: {
      amount: 118250.75,
      currency: "usd"
    },
    debit_date: "2024-01-01",
    pay_period: {
      start_date: "2023-12-16",
      end_date: "2023-12-31"
    },
    pay_date: "2024-01-01",
    employee_count: 12
  },
  {
    payment_id: "pay_2023_12_15_001",
    company_debit: {
      amount: 122890.25,
      currency: "usd"
    },
    debit_date: "2023-12-15",
    pay_period: {
      start_date: "2023-12-01",
      end_date: "2023-12-15"
    },
    pay_date: "2023-12-15",
    employee_count: 11
  }
];

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "emp_001",
    first_name: "John",
    last_name: "Smith",
    department: { name: "Construction" },
    employment: { type: "employee", subtype: "full_time" },
    is_active: true
  },
  {
    id: "emp_002",
    first_name: "Sarah",
    last_name: "Johnson",
    department: { name: "Administration" },
    employment: { type: "employee", subtype: "full_time" },
    is_active: true
  },
  // Add more mock employees as needed
];

const MOCK_PAY_STATEMENTS: Record<string, PayStatement[]> = {
  "pay_2024_01_15_001": [
    {
      payment_id: "pay_2024_01_15_001",
      individual_id: "emp_001",
      type: "regular_payroll",
      gross_pay: { amount: 5500.00, currency: "usd" },
      net_pay: { amount: 4125.50, currency: "usd" },
      earnings: [
        { name: "Regular", amount: 5500.00, currency: "usd", type: "salary" }
      ],
      taxes: [
        { name: "Federal Income Tax", amount: 825.00, currency: "usd", type: "federal" },
        { name: "Social Security", amount: 341.00, currency: "usd", type: "fica" },
        { name: "Medicare", amount: 79.75, currency: "usd", type: "fica" }
      ],
      employee_deductions: [
        { name: "Health Insurance", amount: 128.75, currency: "usd", type: "insurance" }
      ]
    }
  ]
};

const PayrollDashboard: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [payStatements, setPayStatements] = useState<Record<string, PayStatement[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulate API fetch - Replace with actual Finch API calls
  useEffect(() => {
    const fetchPayrollData = async () => {
      setIsLoading(true);
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // TODO: Replace with actual Finch API calls:
        // const paymentsResponse = await fetch('https://api.tryfinch.com/employer/payment', {
        //   headers: { 'Authorization': `Bearer ${FINCH_ACCESS_TOKEN}` }
        // });
        // const employeesResponse = await fetch('https://api.tryfinch.com/employer/directory', {
        //   headers: { 'Authorization': `Bearer ${FINCH_ACCESS_TOKEN}` }
        // });
        
        setPayments(MOCK_PAYMENTS);
        setEmployees(MOCK_EMPLOYEES.filter(emp => emp.is_active));
        setPayStatements(MOCK_PAY_STATEMENTS);
        setError(null);
      } catch (err) {
        setError('Failed to fetch payroll data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayrollData();
  }, []);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const ytdTotal = payments.reduce((sum, payment) => sum + payment.company_debit.amount, 0);
    const activeEmployeeCount = employees.length;
    const nextPayDate = payments.length > 0 
      ? new Date(payments[0].pay_date) 
      : new Date();

    return {
      ytdTotal,
      activeEmployeeCount,
      nextPayDate: nextPayDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    };
  }, [payments, employees]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-surface-on dark:text-gray-100">
            Payroll Dashboard
          </h1>
          <p className="text-surface-on-variant dark:text-gray-400 mt-1">
            Powered by Finch API • Gusto Integration
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-on rounded-lg hover:opacity-90 transition-opacity">
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* YTD Payroll Cost */}
        <div className="bg-surface dark:bg-gray-800 rounded-xl border border-surface-outline-variant dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-container dark:bg-primary/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>12%</span>
            </div>
          </div>
          <h3 className="text-surface-on-variant dark:text-gray-400 text-sm font-medium">
            YTD Payroll Cost
          </h3>
          <p className="text-3xl font-bold text-surface-on dark:text-gray-100 mt-2">
            {formatCurrency(kpis.ytdTotal)}
          </p>
        </div>

        {/* Active Employees */}
        <div className="bg-surface dark:bg-gray-800 rounded-xl border border-surface-outline-variant dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-secondary-container dark:bg-secondary/20 rounded-lg">
              <Users className="h-6 w-6 text-secondary dark:text-secondary-container" />
            </div>
          </div>
          <h3 className="text-surface-on-variant dark:text-gray-400 text-sm font-medium">
            Active Employees
          </h3>
          <p className="text-3xl font-bold text-surface-on dark:text-gray-100 mt-2">
            {kpis.activeEmployeeCount}
          </p>
        </div>

        {/* Next Pay Date */}
        <div className="bg-surface dark:bg-gray-800 rounded-xl border border-surface-outline-variant dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-tertiary-container dark:bg-tertiary/20 rounded-lg">
              <Calendar className="h-6 w-6 text-tertiary dark:text-tertiary-container" />
            </div>
          </div>
          <h3 className="text-surface-on-variant dark:text-gray-400 text-sm font-medium">
            Next Pay Date
          </h3>
          <p className="text-3xl font-bold text-surface-on dark:text-gray-100 mt-2">
            {kpis.nextPayDate}
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
              {payments.map((payment) => (
                <React.Fragment key={payment.payment_id}>
                  <tr 
                    className="hover:bg-surface-container/50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                    onClick={() => togglePaymentDetails(payment.payment_id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                        <span className="text-sm font-mono text-surface-on dark:text-gray-100">
                          {payment.payment_id.split('_').slice(-3).join('_')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-surface-on dark:text-gray-100">
                        {new Date(payment.pay_period.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' - '}
                        {new Date(payment.pay_period.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-on dark:text-gray-100">
                      {new Date(payment.pay_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                        <span className="text-sm text-surface-on dark:text-gray-100">
                          {payment.employee_count}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-surface-on dark:text-gray-100">
                        {formatCurrency(payment.company_debit.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {expandedPayment === payment.payment_id ? (
                        <ChevronUp className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
                      )}
                    </td>
                  </tr>
                  
                  {/* Expanded Details */}
                  {expandedPayment === payment.payment_id && payStatements[payment.payment_id] && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-surface-container/30 dark:bg-gray-700/20">
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-surface-on dark:text-gray-100 mb-3">
                            Payment Breakdown
                          </h4>
                          
                          {payStatements[payment.payment_id].map((statement, idx) => (
                            <div key={idx} className="bg-surface dark:bg-gray-800 rounded-lg p-4 border border-surface-outline-variant dark:border-gray-700">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Gross Pay */}
                                <div>
                                  <p className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">
                                    Gross Pay
                                  </p>
                                  <p className="text-lg font-semibold text-surface-on dark:text-gray-100">
                                    {formatCurrency(statement.gross_pay.amount)}
                                  </p>
                                </div>
                                
                                {/* Taxes */}
                                <div>
                                  <p className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">
                                    Taxes
                                  </p>
                                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                                    -{formatCurrency(statement.taxes.reduce((sum, tax) => sum + tax.amount, 0))}
                                  </p>
                                  <ul className="mt-1 space-y-0.5">
                                    {statement.taxes.map((tax, taxIdx) => (
                                      <li key={taxIdx} className="text-xs text-surface-on-variant dark:text-gray-400">
                                        {tax.name}: {formatCurrency(tax.amount)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                
                                {/* Deductions */}
                                <div>
                                  <p className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">
                                    Deductions
                                  </p>
                                  <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                                    -{formatCurrency(statement.employee_deductions.reduce((sum, ded) => sum + ded.amount, 0))}
                                  </p>
                                  <ul className="mt-1 space-y-0.5">
                                    {statement.employee_deductions.map((ded, dedIdx) => (
                                      <li key={dedIdx} className="text-xs text-surface-on-variant dark:text-gray-400">
                                        {ded.name}: {formatCurrency(ded.amount)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                
                                {/* Net Pay */}
                                <div>
                                  <p className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">
                                    Net Pay
                                  </p>
                                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(statement.net_pay.amount)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sandbox Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Sandbox Mode Active
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              You're viewing test data from Finch's sandbox environment. Connect to production to see real payroll data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollDashboard;


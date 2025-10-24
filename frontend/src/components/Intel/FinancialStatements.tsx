import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface FinancialStatementsProps {
  incomeStatement: Record<string, any>;
  balanceSheet: Record<string, any>;
  cashFlow: Record<string, any>;
}

type StatementType = 'income' | 'balance' | 'cashflow';

export const FinancialStatements: React.FC<FinancialStatementsProps> = ({
  incomeStatement,
  balanceSheet,
  cashFlow
}) => {
  const [activeStatement, setActiveStatement] = useState<StatementType>('income');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Helper: Format large numbers to readable format
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';

    const absNum = Math.abs(num);
    if (absNum >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (absNum >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (absNum >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (absNum >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  // Helper: Calculate year-over-year change percentage
  const calculateYoYChange = (values: (number | null)[]): string => {
    if (values.length < 2 || values[0] === null || values[1] === null) return 'N/A';
    const change = ((values[0] - values[1]) / Math.abs(values[1])) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  // Helper: Get YoY change color
  const getYoYColor = (values: (number | null)[], isRevenueOrProfit: boolean = true): string => {
    if (values.length < 2 || values[0] === null || values[1] === null) return 'text-[#3C3C3C]';
    const change = values[0] - values[1];

    if (isRevenueOrProfit) {
      return change >= 0 ? 'text-green-400' : 'text-red-400';
    } else {
      // For expenses/debt, lower is better
      return change <= 0 ? 'text-green-400' : 'text-red-400';
    }
  };

  // Parse financial statement data
  const parseStatement = (statement: Record<string, any>) => {
    const dates = Object.keys(statement).sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      return dateB - dateA; // Most recent first
    });

    const rows: Record<string, (number | null)[]> = {};

    dates.forEach(date => {
      const yearData = statement[date];
      Object.entries(yearData).forEach(([key, value]) => {
        if (!rows[key]) rows[key] = [];
        rows[key].push(typeof value === 'number' ? value : null);
      });
    });

    return { dates: dates.slice(0, 5), rows }; // Limit to 5 years
  };

  // Income Statement Row Configuration
  const incomeStatementRows = [
    { key: 'Total Revenue', label: 'Total Revenue', isRevenue: true },
    { key: 'Cost Of Revenue', label: 'Cost of Revenue', isRevenue: false },
    { key: 'Gross Profit', label: 'Gross Profit', isRevenue: true },
    { key: 'Operating Expense', label: 'Operating Expenses', isRevenue: false },
    { key: 'Operating Income', label: 'Operating Income', isRevenue: true },
    { key: 'Net Income', label: 'Net Income', isRevenue: true },
    { key: 'EBITDA', label: 'EBITDA', isRevenue: true },
    { key: 'Basic EPS', label: 'EPS (Basic)', isRevenue: true },
    { key: 'Diluted EPS', label: 'EPS (Diluted)', isRevenue: true }
  ];

  // Balance Sheet Row Configuration
  const balanceSheetRows = [
    { key: 'Total Assets', label: 'Total Assets', isRevenue: true },
    { key: 'Current Assets', label: 'Current Assets', isRevenue: true },
    { key: 'Cash And Cash Equivalents', label: 'Cash & Equivalents', isRevenue: true },
    { key: 'Total Liabilities Net Minority Interest', label: 'Total Liabilities', isRevenue: false },
    { key: 'Current Liabilities', label: 'Current Liabilities', isRevenue: false },
    { key: 'Long Term Debt', label: 'Long-Term Debt', isRevenue: false },
    { key: 'Stockholders Equity', label: 'Stockholders Equity', isRevenue: true },
    { key: 'Retained Earnings', label: 'Retained Earnings', isRevenue: true },
    { key: 'Working Capital', label: 'Working Capital', isRevenue: true }
  ];

  // Cash Flow Row Configuration
  const cashFlowRows = [
    { key: 'Operating Cash Flow', label: 'Operating Cash Flow', isRevenue: true },
    { key: 'Investing Cash Flow', label: 'Investing Cash Flow', isRevenue: true },
    { key: 'Financing Cash Flow', label: 'Financing Cash Flow', isRevenue: true },
    { key: 'Free Cash Flow', label: 'Free Cash Flow', isRevenue: true },
    { key: 'Capital Expenditure', label: 'Capital Expenditure', isRevenue: false },
    { key: 'End Cash Position', label: 'End Cash Position', isRevenue: true }
  ];

  const currentData = useMemo(() => {
    if (activeStatement === 'income') {
      return { statement: incomeStatement, rows: incomeStatementRows };
    } else if (activeStatement === 'balance') {
      return { statement: balanceSheet, rows: balanceSheetRows };
    } else {
      return { statement: cashFlow, rows: cashFlowRows };
    }
  }, [activeStatement, incomeStatement, balanceSheet, cashFlow]);

  const parsedData = useMemo(() => {
    return parseStatement(currentData.statement);
  }, [currentData.statement]);

  const toggleRow = (rowKey: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowKey)) {
      newExpanded.delete(rowKey);
    } else {
      newExpanded.add(rowKey);
    }
    setExpandedRows(newExpanded);
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  if (!parsedData.dates || parsedData.dates.length === 0) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <h3 className="text-sm font-semibold text-[#1a1a1a]">Financial Statements</h3>
        </CardHeader>
        <CardContent className="p-3">
          <div className="text-center text-[#3C3C3C] py-2.5">
            Financial statement data not available for this stock
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <h3 className="text-sm font-semibold text-[#1a1a1a]">Financial Statements</h3>

        {/* Statement Tabs */}
        <div className="flex gap-2.5 mt-3">
          <button
            onClick={() => setActiveStatement('income')}
            className={`px-3 py-2.5 rounded-lg font-medium transition-colors ${
              activeStatement === 'income'
                ? 'bg-blue-600 text-[#1a1a1a]'
                : 'bg-gray-800 text-[#3C3C3C] hover:bg-gray-700'
            }`}
          >
            Income Statement
          </button>
          <button
            onClick={() => setActiveStatement('balance')}
            className={`px-3 py-2.5 rounded-lg font-medium transition-colors ${
              activeStatement === 'balance'
                ? 'bg-blue-600 text-[#1a1a1a]'
                : 'bg-gray-800 text-[#3C3C3C] hover:bg-gray-700'
            }`}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => setActiveStatement('cashflow')}
            className={`px-3 py-2.5 rounded-lg font-medium transition-colors ${
              activeStatement === 'cashflow'
                ? 'bg-blue-600 text-[#1a1a1a]'
                : 'bg-gray-800 text-[#3C3C3C] hover:bg-gray-700'
            }`}
          >
            Cash Flow
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="glass-card sticky top-0">
              <tr>
                <th className="text-left p-3 text-[#3C3C3C] font-medium min-w-[200px]">
                  Item
                </th>
                {parsedData.dates.map((date, idx) => (
                  <th key={idx} className="text-right p-3 text-[#3C3C3C] font-medium min-w-[120px]">
                    {formatDate(date)}
                  </th>
                ))}
                <th className="text-right p-3 text-[#3C3C3C] font-medium min-w-[100px]">
                  YoY Change
                </th>
              </tr>
            </thead>
            <tbody>
              {currentData.rows.map((rowConfig, idx) => {
                const values = parsedData.rows[rowConfig.key] || [];
                const yoyChange = calculateYoYChange(values);
                const yoyColor = getYoYColor(values, rowConfig.isRevenue);
                const hasData = values.some(v => v !== null && v !== undefined);

                if (!hasData) return null;

                return (
                  <tr
                    key={rowConfig.key}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                      idx % 2 === 0 ? 'bg-gray-900/30' : ''
                    }`}
                  >
                    <td className="p-3 text-[#1a1a1a] font-medium">
                      {rowConfig.label}
                    </td>
                    {values.map((value, valueIdx) => (
                      <td key={valueIdx} className="p-3 text-right text-[#1a1a1a]">
                        {value !== null && value !== undefined
                          ? `$${formatNumber(value)}`
                          : 'N/A'}
                      </td>
                    ))}
                    <td className={`p-3 text-right font-medium ${yoyColor}`}>
                      <div className="flex items-center justify-end gap-1.5">
                        {yoyChange !== 'N/A' && (
                          <>
                            {values[0]! > values[1]! ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                          </>
                        )}
                        {yoyChange}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="p-3 bg-gray-800/30 border-t border-gray-800">
          <div className="text-sm text-[#3C3C3C]">
            <span className="font-medium text-[#1a1a1a]">Note:</span> All values are in USD.
            YoY Change compares most recent year to previous year.
            {activeStatement === 'income' && ' Revenue and profit metrics shown.'}
            {activeStatement === 'balance' && ' Assets, liabilities, and equity shown.'}
            {activeStatement === 'cashflow' && ' Operating, investing, and financing activities shown.'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Plus, Edit2, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

type TransactionType = 'expense' | 'income' | 'dividend' | 'capital_gain' | 'interest';

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: TransactionType;
  amount: number;
  vendor?: string;
  recurring: boolean;
  frequency?: 'monthly' | 'quarterly' | 'annually';
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: '2024-03-20',
    description: 'Office rent - March',
    category: 'office',
    type: 'expense',
    amount: -2500,
    vendor: 'Downtown Realty Inc.',
    recurring: true,
    frequency: 'monthly',
  },
  {
    id: '2',
    date: '2024-03-18',
    description: 'Client Project Invoice',
    category: 'income',
    type: 'income',
    amount: 8500,
    vendor: 'Tech Startup Ltd.',
    recurring: false,
  },
  {
    id: '3',
    date: '2024-03-15',
    description: 'Professional accounting services',
    category: 'accounting',
    type: 'expense',
    amount: -750,
    vendor: 'BDO Canada',
    recurring: false,
  },
  {
    id: '4',
    date: '2024-03-15',
    description: 'Dividend distribution - RBC',
    category: 'dividend',
    type: 'dividend',
    amount: 450,
    vendor: 'RBC Dominion Securities',
    recurring: true,
    frequency: 'quarterly',
  },
  {
    id: '5',
    date: '2024-03-10',
    description: 'Internet and phone',
    category: 'office',
    type: 'expense',
    amount: -129.99,
    vendor: 'Bell Canada',
    recurring: true,
    frequency: 'monthly',
  },
  {
    id: '6',
    date: '2024-03-08',
    description: 'Legal consultation - Contract review',
    category: 'legal',
    type: 'expense',
    amount: -1200,
    vendor: 'Smith & Associates LLP',
    recurring: false,
  },
  {
    id: '7',
    date: '2024-03-05',
    description: 'Software licenses - Seat licenses',
    category: 'technology',
    type: 'expense',
    amount: -385.50,
    vendor: 'Microsoft',
    recurring: true,
    frequency: 'annually',
  },
  {
    id: '8',
    date: '2024-03-01',
    description: 'Capital gains - AAPL sale',
    category: 'capital_gain',
    type: 'capital_gain',
    amount: 3200,
    vendor: 'Interactive Brokers',
    recurring: false,
  },
  {
    id: '9',
    date: '2024-02-28',
    description: 'Insurance - General liability',
    category: 'insurance',
    type: 'expense',
    amount: -425,
    vendor: 'Intact Insurance',
    recurring: true,
    frequency: 'quarterly',
  },
  {
    id: '10',
    date: '2024-02-25',
    description: 'Business travel - Toronto conference',
    category: 'travel',
    type: 'expense',
    amount: -1650,
    vendor: 'Expedia',
    recurring: false,
  },
];

const categoryOptions = [
  { value: 'office', label: 'Office' },
  { value: 'professional', label: 'Professional services' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals & entertainment' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'technology', label: 'Technology' },
  { value: 'bank', label: 'Bank fees' },
  { value: 'legal', label: 'Legal fees' },
  { value: 'accounting', label: 'Accounting fees' },
  { value: 'dividend', label: 'Dividend' },
  { value: 'capital_gain', label: 'Capital gain' },
  { value: 'interest', label: 'Interest' },
  { value: 'other', label: 'Other' },
];

const typeOptions = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'dividend', label: 'Dividend' },
  { value: 'capital_gain', label: 'Capital gain' },
  { value: 'interest', label: 'Interest' },
];

function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Transaction>) => void;
  initialData?: Transaction;
}) {
  const t = useTranslations('expenses');
  const commonT = useTranslations('common');
  const [formData, setFormData] = useState<Partial<Transaction>>(
    initialData || {
      type: 'expense',
      category: 'office',
      date: new Date().toISOString().split('T')[0],
      recurring: false,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Transaction' : t('addTransaction')}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>
            {commonT('cancel')}
          </Button>
          <Button variant="primary" fullWidth onClick={handleSubmit}>
            {commonT('save')}
          </Button>
        </div>
      }
    >
      <form className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t('type')}
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value as TransactionType })}
            options={typeOptions}
          />
          <Input
            label={commonT('date')}
            type="date"
            value={formData.date || ''}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        <Input
          label={commonT('description')}
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={commonT('category')}
            value={formData.category || ''}
            onChange={(value) => setFormData({ ...formData, category: value as string })}
            options={categoryOptions}
            required
          />
          <Input
            label={commonT('amount')}
            type="number"
            step="0.01"
            value={Math.abs(formData.amount || 0)}
            onChange={(e) =>
              setFormData({
                ...formData,
                amount:
                  formData.type === 'income' ||
                  formData.type === 'dividend' ||
                  formData.type === 'capital_gain' ||
                  formData.type === 'interest'
                    ? parseFloat(e.target.value)
                    : -parseFloat(e.target.value),
              })
            }
            required
          />
        </div>

        <Input
          label="Vendor / Payer"
          value={formData.vendor || ''}
          onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
        />

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="recurring"
            checked={formData.recurring || false}
            onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
            className="w-4 h-4 text-tenir-600 rounded"
          />
          <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
            {t('recurring')}
          </label>
        </div>

        {formData.recurring && (
          <Select
            label="Frequency"
            value={formData.frequency || ''}
            onChange={(value) => setFormData({ ...formData, frequency: value as any })}
            options={[
              { value: 'monthly', label: t('monthly') },
              { value: 'quarterly', label: t('quarterly') },
              { value: 'annually', label: t('annually') },
            ]}
          />
        )}
      </form>
    </Modal>
  );
}

function SummaryCard({
  title,
  value,
  isNegative,
  subtitle,
}: {
  title: string;
  value: number;
  isNegative?: boolean;
  subtitle?: string;
}) {
  return (
    <Card padding="md" shadow="sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p
            className={cn(
              'text-2xl font-bold',
              isNegative ? 'text-red-600' : 'text-green-600'
            )}
          >
            {formatCurrency(value)}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
        </div>
        <div
          className={cn(
            'p-3 rounded-lg',
            isNegative ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
          )}
        >
          {isNegative ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
        </div>
      </div>
    </Card>
  );
}

export default function ExpensesPage() {
  const t = useTranslations('expenses');
  const commonT = useTranslations('common');
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
    if (dateRange.start && tx.date < dateRange.start) return false;
    if (dateRange.end && tx.date > dateRange.end) return false;
    return true;
  });

  // Calculate summaries
  const totalExpenses = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const totalIncome = transactions
    .filter((tx) => ['income', 'dividend', 'capital_gain', 'interest'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netIncome = totalIncome - totalExpenses;

  // Tax deductible (all expenses + professional income, excluding dividends/capital gains)
  const taxDeductible = totalExpenses +
    transactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

  // Category breakdown
  const categoryBreakdown = categoryOptions.map((cat) => {
    const amount = transactions
      .filter((tx) => tx.category === cat.value)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return { ...cat, amount };
  }).filter((cat) => cat.amount > 0);

  const handleAddTransaction = (data: Partial<Transaction>) => {
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: data.date || new Date().toISOString().split('T')[0],
      description: data.description || '',
      category: data.category || 'office',
      type: data.type || 'expense',
      amount: data.amount || 0,
      vendor: data.vendor,
      recurring: data.recurring || false,
      frequency: data.frequency,
    };
    setTransactions([newTransaction, ...transactions]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SummaryCard
              title="Total Expenses"
              value={totalExpenses}
              isNegative
              subtitle="Deductible costs"
            />
            <SummaryCard
              title="Total Income"
              value={totalIncome}
              subtitle="All revenue sources"
            />
            <SummaryCard
              title="Net Income"
              value={netIncome}
              isNegative={netIncome < 0}
              subtitle="Income minus expenses"
            />
            <SummaryCard
              title="Tax Deductible"
              value={taxDeductible}
              isNegative
              subtitle="For tax filing"
            />
          </div>

          {/* Filters */}
          <Card padding="md" shadow="sm" className="mb-8">
            <CardHeader>
              <CardTitle level="h3">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Select
                  label={t('type')}
                  value={typeFilter}
                  onChange={(value) => setTypeFilter(value as string)}
                  options={[{ value: 'all', label: 'All Types' }, ...typeOptions]}
                />
                <Select
                  label={commonT('category')}
                  value={categoryFilter}
                  onChange={(value) => setCategoryFilter(value as string)}
                  options={[{ value: 'all', label: 'All Categories' }, ...categoryOptions]}
                />
                <Input
                  label="Start Date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
                <div className="flex items-end">
                  <Button variant="outline" fullWidth size="md">
                    Clear filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Transaction Button */}
          <div className="mb-8">
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => setIsModalOpen(true)}
            >
              {t('addTransaction')}
            </Button>
          </div>

          {/* Transactions Table */}
          <Card padding="none" shadow="sm" className="mb-8">
            <CardHeader className="px-6 pt-6">
              <CardTitle level="h3">
                Transactions ({filteredTransactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table hoverable>
                <TableHeader>
                  <TableRow isHeader>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead align="right">Amount</TableHead>
                    <TableHead align="center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{formatDate(tx.date)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{tx.description}</p>
                            {tx.vendor && (
                              <p className="text-sm text-gray-600">{tx.vendor}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{tx.category}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tx.type === 'expense'
                                ? 'error'
                                : tx.type === 'income'
                                  ? 'success'
                                  : 'info'
                            }
                            size="sm"
                          >
                            {tx.type === 'capital_gain' ? 'Capital gain' : tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell align="right">
                          <span
                            className={cn(
                              'font-semibold',
                              tx.amount < 0 ? 'text-red-600' : 'text-green-600'
                            )}
                          >
                            {formatCurrency(tx.amount)}
                          </span>
                        </TableCell>
                        <TableCell align="center">
                          <div className="flex items-center justify-center gap-2">
                            <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                              <Edit2 size={16} className="text-gray-600" />
                            </button>
                            <button className="p-1 hover:bg-red-50 rounded transition-colors">
                              <Trash2 size={16} className="text-red-600" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-gray-600">{commonT('noResults')}</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card padding="md" shadow="sm">
            <CardHeader>
              <CardTitle level="h3">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.value} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{cat.label}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-40 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-tenir-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${(cat.amount / Math.max(...categoryBreakdown.map((c) => c.amount))) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="font-semibold text-gray-900 w-24 text-right">
                        {formatCurrency(cat.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
      />
    </div>
  );
}

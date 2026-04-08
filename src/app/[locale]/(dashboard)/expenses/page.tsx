'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
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
import { useOrganization } from '@/hooks/useOrganization';
import { createClient } from '@/lib/supabase/client';

type TransactionType = 'expense' | 'income' | 'dividend' | 'capital_gain' | 'interest';

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: TransactionType;
  amount: number;
  vendor?: string;
  is_recurring: boolean;
  recurrence_frequency?: string;
  organization_id?: string;
  created_by?: string;
}

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

interface ModalFormData {
  type: TransactionType;
  category: string;
  date: string;
  description: string;
  amount: number;
  vendor: string;
  is_recurring: boolean;
  recurrence_frequency: string;
}

function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ModalFormData) => void;
  initialData?: Transaction;
}) {
  const t = useTranslations('expenses');
  const commonT = useTranslations('common');
  const [formData, setFormData] = useState<ModalFormData>(
    initialData
      ? {
          type: initialData.type,
          category: initialData.category,
          date: initialData.date,
          description: initialData.description,
          amount: initialData.amount,
          vendor: initialData.vendor || '',
          is_recurring: initialData.is_recurring,
          recurrence_frequency: initialData.recurrence_frequency || '',
        }
      : {
          type: 'expense',
          category: 'office',
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: 0,
          vendor: '',
          is_recurring: false,
          recurrence_frequency: '',
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
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        <Input
          label={commonT('description')}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={commonT('category')}
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value as string })}
            options={categoryOptions}
            required
          />
          <Input
            label={commonT('amount')}
            type="number"
            step="0.01"
            value={Math.abs(formData.amount)}
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
          value={formData.vendor}
          onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
        />

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="recurring"
            checked={formData.is_recurring}
            onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
            className="w-4 h-4 text-tenir-600 rounded"
          />
          <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
            {t('recurring')}
          </label>
        </div>

        {formData.is_recurring && (
          <Select
            label="Frequency"
            value={formData.recurrence_frequency}
            onChange={(value) => setFormData({ ...formData, recurrence_frequency: value as string })}
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
  const supabase = createClient();
  const { orgId, user, loading: orgLoading } = useOrganization();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get('search') ?? '');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Sync searchQuery when the URL param changes (e.g. navigating from header search)
  useEffect(() => {
    const paramValue = searchParams.get('search') ?? '';
    setSearchQuery(paramValue);
  }, [searchParams]);

  useEffect(() => {
    if (!orgId) return;
    async function fetchTransactions() {
      setTxLoading(true);
      setTxError(null);
      try {
        const { data, error } = await (supabase as any)
          .from('transactions')
          .select('*')
          .eq('organization_id', orgId)
          .order('date', { ascending: false });
        if (error) throw error;
        setTransactions(data || []);
      } catch (e: any) {
        setTxError(e.message);
      } finally {
        setTxLoading(false);
      }
    }
    fetchTransactions();
  }, [orgId]);

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

  const handleAddTransaction = async (data: ModalFormData) => {
    if (!orgId || !user) return;
    try {
      const insertData = {
        organization_id: orgId,
        type: data.type,
        category: data.category,
        date: data.date,
        description: data.description,
        amount: data.amount,
        vendor: data.vendor || null,
        is_recurring: data.is_recurring,
        recurrence_frequency: data.recurrence_frequency || null,
        currency: 'CAD',
        created_by: user.id,
      };
      const { data: newTx, error } = await (supabase as any)
        .from('transactions')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      setTransactions([newTx, ...transactions]);
    } catch (e: any) {
      setTxError(e.message);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setTransactions(transactions.filter((tx) => tx.id !== id));
    } catch (e: any) {
      setTxError(e.message);
    }
  };

  const isLoading = orgLoading || txLoading;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {txError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {txError}
            </div>
          )}

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
                  <Button
                    variant="outline"
                    fullWidth
                    size="md"
                    onClick={() => {
                      setTypeFilter('all');
                      setCategoryFilter('all');
                      setDateRange({ start: '', end: '' });
                    }}
                  >
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
              disabled={!orgId}
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
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading transactions...</div>
              ) : (
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
                              <button
                                className="p-1 hover:bg-red-50 rounded transition-colors"
                                onClick={() => handleDeleteTransaction(tx.id)}
                              >
                                <Trash2 size={16} className="text-red-600" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <p className="text-gray-600">
                            {transactions.length === 0
                              ? 'No transactions yet. Add your first transaction to get started.'
                              : commonT('noResults')}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          {categoryBreakdown.length > 0 && (
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
          )}
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

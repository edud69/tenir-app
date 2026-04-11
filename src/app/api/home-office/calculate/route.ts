import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { HomeOfficeCalculation, HomeOfficeExpenseBreakdown, ExpenseType } from '@/types/home-office';
import { EXPENSE_TYPE_LABELS, annualizeExpense } from '@/types/home-office';

// POST /api/home-office/calculate
// Body: { homeOfficeId: string }
// Returns: HomeOfficeCalculation
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { homeOfficeId: string };
    const { homeOfficeId } = body;

    if (!homeOfficeId) {
      return NextResponse.json({ error: 'homeOfficeId is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: office, error: officeError } = await (supabase as ReturnType<typeof supabase.from> extends never ? never : typeof supabase)
      .from('home_offices')
      .select('*')
      .eq('id', homeOfficeId)
      .single();

    if (officeError || !office) {
      return NextResponse.json({ error: officeError?.message ?? 'Home office not found' }, { status: 404 });
    }

    const { data: expenses, error: expensesError } = await (supabase as any)
      .from('home_office_expenses')
      .select('expense_type, amount, period_start, period_end')
      .eq('home_office_id', homeOfficeId);

    if (expensesError) {
      return NextResponse.json({ error: expensesError.message }, { status: 500 });
    }

    // Annualize each expense and aggregate by type
    const annualExpensesByType: Record<string, number> = {};
    for (const exp of expenses ?? []) {
      const annual = annualizeExpense(
        Number(exp.amount),
        new Date(exp.period_start),
        new Date(exp.period_end)
      );
      annualExpensesByType[exp.expense_type] = (annualExpensesByType[exp.expense_type] ?? 0) + annual;
    }

    const totalAnnualExpenses = Object.values(annualExpensesByType).reduce((s, v) => s + v, 0);
    const usageRatio = Number(office.office_area_sqft) / Number(office.total_area_sqft);
    const monthsRatio = Number(office.months_used_per_year) / 12;
    const deductibleAmount = totalAnnualExpenses * usageRatio * monthsRatio;
    const monthlyReimbursement = deductibleAmount / 12;

    const expenseBreakdown: HomeOfficeExpenseBreakdown[] = Object.entries(annualExpensesByType).map(
      ([type, annualAmount]) => ({
        expenseType: type,
        label: EXPENSE_TYPE_LABELS[type as ExpenseType]?.fr ?? type,
        annualAmount: Math.round(annualAmount * 100) / 100,
        deductibleAmount: Math.round(annualAmount * usageRatio * monthsRatio * 100) / 100,
      })
    );

    const result: HomeOfficeCalculation = {
      homeOfficeId,
      label: office.label,
      totalAreaSqft: Number(office.total_area_sqft),
      officeAreaSqft: Number(office.office_area_sqft),
      usageRatio: Math.round(usageRatio * 10000) / 10000,
      monthsUsedPerYear: Number(office.months_used_per_year),
      annualExpensesByType,
      totalAnnualExpenses: Math.round(totalAnnualExpenses * 100) / 100,
      deductibleAmount: Math.round(deductibleAmount * 100) / 100,
      monthlyReimbursement: Math.round(monthlyReimbursement * 100) / 100,
      expenseBreakdown,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in home-office calculate:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/home-office/calculate?orgId=xxx
// Returns: HomeOfficeCalculation[] for all active home offices of org
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: offices, error: officesError } = await (supabase as any)
      .from('home_offices')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true);

    if (officesError) {
      return NextResponse.json({ error: officesError.message }, { status: 500 });
    }

    const results: HomeOfficeCalculation[] = [];

    for (const office of offices ?? []) {
      const { data: expenses } = await (supabase as any)
        .from('home_office_expenses')
        .select('expense_type, amount, period_start, period_end')
        .eq('home_office_id', office.id);

      const annualExpensesByType: Record<string, number> = {};
      for (const exp of expenses ?? []) {
        const annual = annualizeExpense(
          Number(exp.amount),
          new Date(exp.period_start),
          new Date(exp.period_end)
        );
        annualExpensesByType[exp.expense_type] = (annualExpensesByType[exp.expense_type] ?? 0) + annual;
      }

      const totalAnnualExpenses = Object.values(annualExpensesByType).reduce((s, v) => s + v, 0);
      const usageRatio = Number(office.office_area_sqft) / Number(office.total_area_sqft);
      const monthsRatio = Number(office.months_used_per_year) / 12;
      const deductibleAmount = totalAnnualExpenses * usageRatio * monthsRatio;

      const expenseBreakdown: HomeOfficeExpenseBreakdown[] = Object.entries(annualExpensesByType).map(
        ([type, annualAmount]) => ({
          expenseType: type,
          label: EXPENSE_TYPE_LABELS[type as ExpenseType]?.fr ?? type,
          annualAmount: Math.round(annualAmount * 100) / 100,
          deductibleAmount: Math.round(annualAmount * usageRatio * monthsRatio * 100) / 100,
        })
      );

      results.push({
        homeOfficeId: office.id,
        label: office.label,
        totalAreaSqft: Number(office.total_area_sqft),
        officeAreaSqft: Number(office.office_area_sqft),
        usageRatio: Math.round(usageRatio * 10000) / 10000,
        monthsUsedPerYear: Number(office.months_used_per_year),
        annualExpensesByType,
        totalAnnualExpenses: Math.round(totalAnnualExpenses * 100) / 100,
        deductibleAmount: Math.round(deductibleAmount * 100) / 100,
        monthlyReimbursement: Math.round(deductibleAmount / 12 * 100) / 100,
        expenseBreakdown,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in home-office calculate GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

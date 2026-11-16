import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../components/ProgressBar';
import { TeamId, TaskStatusType } from '../types';

describe('ProgressBar Component', () => {
  it('renders 1-team review with Todo as 0%', () => {
    const teams: TeamId[] = ['product-analyst'];
    const statuses: Record<TeamId, TaskStatusType> = {
      'product-analyst': 'todo',
    } as any;

    render(<ProgressBar teams={teams} statuses={statuses} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText(/0% complete · waiting on Product Analyst/i)).toBeInTheDocument();
  });

  it('renders 2-team review with 1 Done as 50% on both views', () => {
    const teams: TeamId[] = ['game-developer', 'product-analyst'];
    const statuses: Record<TeamId, TaskStatusType> = {
      'game-developer': 'done',
      'product-analyst': 'todo',
    } as any;

    render(<ProgressBar teams={teams} statuses={statuses} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText(/50% complete · waiting on Product Analyst/i)).toBeInTheDocument();
  });

  it('renders 3-team review with 2 Done as 67%', () => {
    const teams: TeamId[] = ['software-engineer', 'game-developer', 'data-analyst'];
    const statuses: Record<TeamId, TaskStatusType> = {
      'software-engineer': 'done',
      'game-developer': 'done',
      'data-analyst': 'working',
    } as any;

    render(<ProgressBar teams={teams} statuses={statuses} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '67');
    expect(screen.getByText(/67% complete · waiting on Data Analyst/i)).toBeInTheDocument();
  });

  it('renders Completed badge at 100% when all teams finish', () => {
    const teams: TeamId[] = ['software-engineer', 'product-analyst'];
    const statuses: Record<TeamId, TaskStatusType> = {
      'software-engineer': 'done',
      'product-analyst': 'done',
    } as any;

    render(<ProgressBar teams={teams} statuses={statuses} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KanbanBoard } from './KanbanBoard';
import type { Application, PipelineData } from '../../types';

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#test">{children}</a>,
}));
vi.mock('../../api/client', () => ({ default: { patch: vi.fn() } }));

const stages = [
  { id: 's1', job_id: 'j1', name: 'Applied', position: 0, color: '#6366f1', is_terminal: false },
  { id: 's2', job_id: 'j1', name: 'Screened', position: 1, color: '#10b981', is_terminal: false },
];

const candidate = (id: string, name: string, stage: string): Application => ({
  id,
  job_id: 'j1',
  stage_id: stage,
  candidate_name: name,
  candidate_email: `${id}@test.dev`,
  candidate_phone: '',
  form_data: {},
  applied_at: '2026-01-01T00:00:00Z',
});

function renderBoard(data: PipelineData) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={qc}>
      <KanbanBoard jobId="j1" initialData={data} />
    </QueryClientProvider>,
  );
  return {
    ...view,
    rerenderWith: (next: PipelineData) =>
      view.rerender(
        <QueryClientProvider client={qc}>
          <KanbanBoard jobId="j1" initialData={next} />
        </QueryClientProvider>,
      ),
  };
}

describe('KanbanBoard', () => {
  it('renders every stage with its candidate count', () => {
    renderBoard({
      stages,
      applications: { s1: [candidate('a1', 'Ada', 's1'), candidate('a2', 'Alan', 's1')], s2: [] },
    });

    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Screened')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('tolerates a stage the server returned no bucket for', () => {
    // The pipeline payload omits empty stages rather than sending an empty array.
    renderBoard({ stages, applications: { s1: [candidate('a1', 'Ada', 's1')] } });

    expect(screen.getByText('Screened')).toBeInTheDocument();
    expect(screen.getAllByText('Drag candidates here')).toHaveLength(1);
  });

  it('picks up refetched server data', () => {
    // Regression: the board seeded state once and then ignored every refetch, so
    // candidates added elsewhere never appeared until a full reload.
    const { rerenderWith } = renderBoard({
      stages,
      applications: { s1: [candidate('a1', 'Ada', 's1')], s2: [] },
    });
    expect(screen.queryByText('Grace')).not.toBeInTheDocument();

    rerenderWith({
      stages,
      applications: { s1: [candidate('a1', 'Ada', 's1'), candidate('a3', 'Grace', 's1')], s2: [] },
    });

    expect(screen.getByText('Grace')).toBeInTheDocument();
  });
});

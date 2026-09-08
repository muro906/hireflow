import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ApplyPage from './ApplyPage';

vi.mock('react-router-dom', () => ({ useParams: () => ({ id: 'job-1' }) }));

const get = vi.fn();
const post = vi.fn();
vi.mock('../../api/client', () => ({ default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));

const job = {
  id: 'job-1',
  title: 'Backend Engineer',
  description: 'Build things',
  location: 'Remote',
  employment_type: 'full-time',
  form_schema: {
    fields: [{ id: 'yrs', label: 'Years of experience', type: 'text', required: true, options: [] }],
  },
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ApplyPage />
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('Jane Doe'), 'Ada Lovelace');
  await user.type(screen.getByPlaceholderText('jane@example.com'), 'ada@example.com');
  await user.type(screen.getByPlaceholderText('+1 (555) 000-0000'), '+15551234');
  await user.type(screen.getByLabelText(/years of experience/i), '7');

  const cv = new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' });
  await user.upload(screen.getByLabelText(/resume \/ cv/i), cv);

  await user.click(screen.getByRole('button', { name: /submit application/i }));
  return cv;
}

describe('ApplyPage', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    get.mockResolvedValue({ data: job });
    post.mockResolvedValue({ data: {} });
  });

  it('sends the candidate name and email the API expects', async () => {
    // Regression: the page previously read candidate_name/candidate_email, but
    // DynamicForm registers full_name/email, so every submission sent blanks.
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Backend Engineer' });

    await fillAndSubmit(user);

    await waitFor(() => expect(post).toHaveBeenCalled());
    const body = post.mock.calls[0][1] as FormData;
    expect(body.get('candidate_name')).toBe('Ada Lovelace');
    expect(body.get('candidate_email')).toBe('ada@example.com');
    expect(body.get('candidate_phone')).toBe('+15551234');
  });

  it('puts only the custom answers in form_data', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Backend Engineer' });

    await fillAndSubmit(user);

    await waitFor(() => expect(post).toHaveBeenCalled());
    const body = post.mock.calls[0][1] as FormData;
    expect(JSON.parse(body.get('form_data') as string)).toEqual({ yrs: '7' });
  });

  it('attaches the CV file to the request', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Backend Engineer' });

    const cv = await fillAndSubmit(user);

    await waitFor(() => expect(post).toHaveBeenCalled());
    const body = post.mock.calls[0][1] as FormData;
    expect(body.get('cv')).toBe(cv);
  });

  it('does not set Content-Type, so the browser adds the multipart boundary', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Backend Engineer' });

    await fillAndSubmit(user);

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][2]).toBeUndefined();
  });

  it('warns the candidate when the CV could not be stored', async () => {
    post.mockResolvedValue({ data: { cv_error: 'CV must be a PDF, DOC or DOCX file' } });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Backend Engineer' });

    await fillAndSubmit(user);

    expect(await screen.findByText(/couldn't attach your CV/i)).toBeInTheDocument();
  });

  it('shows an error instead of failing silently when submission fails', async () => {
    post.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Backend Engineer' });

    await fillAndSubmit(user);

    expect(await screen.findByText(/couldn't submit your application/i)).toBeInTheDocument();
  });
});

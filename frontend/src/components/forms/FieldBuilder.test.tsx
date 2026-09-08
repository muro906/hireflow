import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldBuilder } from './FieldBuilder';
import type { FormField } from '../../types';

// The most recent onChange payload. Avoids Array.prototype.at, which the app's
// ES2020 lib target does not declare.
function lastArg(fn: ReturnType<typeof vi.fn>) {
  return fn.mock.calls[fn.mock.calls.length - 1]?.[0];
}

describe('FieldBuilder', () => {
  it('adds a field of the chosen type', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FieldBuilder onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /long text/i }));

    const fields = lastArg(onChange) as FormField[];
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe('textarea');
    expect(fields[0].required).toBe(false);
  });

  it('seeds dropdown fields with options so they are configurable', async () => {
    // A select with no options renders an unusable empty dropdown on the apply page.
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FieldBuilder onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /dropdown/i }));

    const fields = lastArg(onChange) as FormField[];
    expect(fields[0].options).toEqual(['Option 1']);
    expect(screen.getByPlaceholderText(/option 1, option 2/i)).toBeInTheDocument();
  });

  it('changes a field type and drops stale options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FieldBuilder
        initialFields={[{ id: 'f1', label: 'Pick one', type: 'select', required: false, options: ['a', 'b'] }]}
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Type'), 'text');

    const fields = lastArg(onChange) as FormField[];
    expect(fields[0].type).toBe('text');
    expect(fields[0].options).toBeUndefined();
  });

  it('edits a label and marks a field required', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FieldBuilder
        initialFields={[{ id: 'f1', label: '', type: 'text', required: false }]}
        onChange={onChange}
      />,
    );

    await user.type(screen.getByPlaceholderText(/what is your experience/i), 'Portfolio');
    await user.click(screen.getByRole('checkbox'));

    const fields = lastArg(onChange) as FormField[];
    expect(fields[0].label).toBe('Portfolio');
    expect(fields[0].required).toBe(true);
  });

  it('removes a field', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FieldBuilder
        initialFields={[{ id: 'f1', label: 'Gone', type: 'text', required: false }]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /remove field/i }));

    expect(lastArg(onChange)).toEqual([]);
  });

  it('never submits an enclosing form', async () => {
    // The builder is rendered inside the job form; buttons without an explicit
    // type default to submit, which used to save the job when adding a field.
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <FieldBuilder initialFields={[{ id: 'f1', label: 'A', type: 'text', required: false }]} />
      </form>,
    );

    await user.click(screen.getByRole('button', { name: /short text/i }));
    await user.click(screen.getAllByRole('button', { name: /remove field/i })[0]);

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

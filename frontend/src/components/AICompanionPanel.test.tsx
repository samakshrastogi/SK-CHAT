import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AICompanionPanel } from './AICompanionPanel.js';

afterEach(cleanup);

const baseProps = {
  isOpen: true,
  consented: false,
  disclosure: 'Requests are sent to the configured provider.',
  messages: [{ sender: 'ai' as const, text: 'Hello' }],
  input: '',
  loading: false,
  onClose: vi.fn(),
  onConsent: vi.fn(async () => undefined),
  onRevoke: vi.fn(async () => undefined),
  onCancel: vi.fn(),
  onInputChange: vi.fn(),
  onSubmit: vi.fn(),
  onSummarize: vi.fn(),
};

describe('AICompanionPanel', () => {
  it('requires explicit consent and disables data-entry controls before consent', () => {
    render(<AICompanionPanel {...baseProps} />);
    expect(screen.getByRole('button', { name: /agree and enable ai/i })).toBeVisible();
    expect(screen.getByLabelText(/ask ai companion/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /send ai request/i })).toBeDisabled();
  });

  it('exposes accessible cancellation while a request is running', () => {
    const onCancel = vi.fn();
    render(<AICompanionPanel {...baseProps} consented loading onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.getByRole('complementary', { name: 'AI companion' })).toBeVisible();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast, useToastStore } from './toastStore.js';

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ messages: [] });
});

describe('toast notifications', () => {
  it('adds accessible non-blocking feedback and expires it', () => {
    toast.success('Saved');
    expect(useToastStore.getState().messages[0]).toMatchObject({ kind: 'success', message: 'Saved' });
    vi.advanceTimersByTime(5000);
    expect(useToastStore.getState().messages).toHaveLength(0);
    vi.useRealTimers();
  });
});

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import StatusChip from '@/components/StatusChip.vue';

describe('StatusChip', () => {
  it('renders the status class and default label', () => {
    const wrapper = mount(StatusChip, { props: { status: 'success' } });
    expect(wrapper.find('[data-test="status-chip"]').classes()).toContain('status-chip--success');
    expect(wrapper.text()).toBe('success');
  });

  it('renders a custom label', () => {
    const wrapper = mount(StatusChip, { props: { status: 'error', label: 'API down' } });
    expect(wrapper.text()).toBe('API down');
  });
});
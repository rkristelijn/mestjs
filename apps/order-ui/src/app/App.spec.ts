import { mount } from '@vue/test-utils';
import App from './App.vue';

describe('App', () => {
  it('renders the orders heading', () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain('Orders');
  });
});

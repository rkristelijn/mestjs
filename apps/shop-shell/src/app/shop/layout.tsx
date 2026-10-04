import { ShopProvider } from './ShopContext';
import { ShopChrome } from './ShopChrome';

// All /shop/* routes share the storefront chrome (top bar + right menu) and the
// SSO/theme context.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShopProvider>
      <ShopChrome>{children}</ShopChrome>
    </ShopProvider>
  );
}

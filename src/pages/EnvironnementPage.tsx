import type { ComponentProps } from 'react';
import { EnvironnementPageV10 } from './EnvironnementPageV10';

export function EnvironnementPage(props: ComponentProps<typeof EnvironnementPageV10>) {
  return <EnvironnementPageV10 {...props} />;
}

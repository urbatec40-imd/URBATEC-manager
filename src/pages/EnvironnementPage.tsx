import type { ComponentProps } from 'react';
import { EnvironnementPageV9 } from './EnvironnementPageV9';

export function EnvironnementPage(props: ComponentProps<typeof EnvironnementPageV9>) {
  return <EnvironnementPageV9 {...props} />;
}

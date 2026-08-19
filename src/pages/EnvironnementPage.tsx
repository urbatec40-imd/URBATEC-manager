import type { ComponentProps } from 'react';
import { EnvironnementPageV11 } from './EnvironnementPageV11';

export function EnvironnementPage(props: ComponentProps<typeof EnvironnementPageV11>) {
  return <EnvironnementPageV11 {...props} />;
}

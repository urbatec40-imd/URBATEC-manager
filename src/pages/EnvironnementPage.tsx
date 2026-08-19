import type { ComponentProps } from 'react';
import { EnvironnementPageV8 } from './EnvironnementPageV8';

export function EnvironnementPage(props: ComponentProps<typeof EnvironnementPageV8>) {
  return <EnvironnementPageV8 {...props} />;
}

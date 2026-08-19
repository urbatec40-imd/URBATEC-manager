import type { ComponentProps } from 'react';
import { EnvironnementPageV7 } from './EnvironnementPageV7';

export function EnvironnementPage(props: ComponentProps<typeof EnvironnementPageV7>) {
  return <EnvironnementPageV7 {...props} />;
}

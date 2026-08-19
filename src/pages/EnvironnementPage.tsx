import type { ComponentProps } from 'react';
import { EnvironnementPageV6 } from './EnvironnementPageV6';

export function EnvironnementPage(props: Omit<ComponentProps<typeof EnvironnementPageV6>, 'initialPrestation'>) {
  return <EnvironnementPageV6 {...props} initialPrestation="" />;
}

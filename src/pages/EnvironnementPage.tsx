import { EnvironnementPageV5 } from './EnvironnementPageV5';

export function EnvironnementPage(props: Omit<React.ComponentProps<typeof EnvironnementPageV5>, 'initialPrestation'>) {
  return <EnvironnementPageV5 {...props} initialPrestation="" />;
}

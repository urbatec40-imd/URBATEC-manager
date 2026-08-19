import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { EnvironnementPageV7 } from './EnvironnementPageV7';
import { EnvironnementEstimationCard } from '@/components/EnvironnementEstimationCard';

export function EnvironnementPage(props: ComponentProps<typeof EnvironnementPageV7>) {
  const [rubriqueAccepted, setRubriqueAccepted] = useState(false);

  useEffect(() => {
    const update = () => {
      const text = document.body.innerText;
      setRubriqueAccepted(text.includes('Rubriques acceptées') && text.includes('rubrique(s)'));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6">
      {rubriqueAccepted && <EnvironnementEstimationCard />}
      <EnvironnementPageV7 {...props} />
    </div>
  );
}

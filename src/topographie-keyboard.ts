function isTopographieSelect(target: EventTarget | null): target is HTMLSelectElement {
  return target instanceof HTMLSelectElement && !!target.closest('aside');
}

function getCadastralSelects() {
  const heading = Array.from(document.querySelectorAll('aside h2')).find((el) =>
    el.textContent?.toLocaleLowerCase().includes('recherche cadastrale')
  );
  const aside = heading?.closest('aside');
  if (!aside) return null;
  const selects = Array.from(aside.querySelectorAll('select')) as HTMLSelectElement[];
  if (selects.length < 2) return null;
  return { section: selects[0], ilot: selects[1], aside };
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;

  const target = event.target;
  if (!isTopographieSelect(target)) return;

  const controls = getCadastralSelects();
  if (!controls) return;

  if (target === controls.section) {
    event.preventDefault();
    if (controls.section.value) {
      controls.ilot.focus();
    }
    return;
  }

  if (target === controls.ilot) {
    event.preventDefault();
    if (!controls.section.value || !controls.ilot.value) return;

    const addButton = Array.from(controls.aside.querySelectorAll('button')).find((button) =>
      button.textContent?.toLocaleLowerCase().includes('ajouter la parcelle')
    ) as HTMLButtonElement | undefined;

    addButton?.click();
  }
});

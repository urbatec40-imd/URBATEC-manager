# Topographie — correction satellite

La correction conserve la géométrie et la surface du KMZ et applique uniquement une translation Est/Nord.

Modes: OFF, Manuel, Auto.

Le mode Auto compare les contours de la parcelle avec les gradients de l'imagerie satellite disponible au zoom courant. Il recalcule une translation absolue à chaque zoom et ne cumule pas les déplacements.

Les sources Google/Esri peuvent dépendre des règles CORS du fournisseur; si les images ne sont pas accessibles au navigateur, le mode Auto affiche un message et laisse la parcelle inchangée.
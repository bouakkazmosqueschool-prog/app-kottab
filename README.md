# كُتّاب — تطبيق تتبع الحفظ والمراجعة

Application de suivi pédagogique pour كُتّاب مسجد بوعكاز القديم (école coranique).
Suivi du حفظ (mémorisation), المراجعة (révision) et الألواح (tablettes) par élève et par période, avec calcul automatique du taux d'accomplissement.

Interface 100% arabe, RTL. Stack : React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand + React Router + Recharts.

## Lancer en local

```bash
npm install
npm run dev       # serveur de développement
npm run build     # build de production → dist/
npm run preview   # prévisualiser le build
```

## Stockage des données (v1)

Toutes les données (élèves, objectifs, historique de mémorisation, paramètres) sont stockées dans le **localStorage** du navigateur via `zustand/persist`, dans 4 clés séparées :

- `kottab-students-v1`
- `kottab-goals-v1`
- `kottab-memorization-v1`
- `kottab-settings-v1`

Au tout premier lancement (aucune donnée en localStorage), l'application charge un jeu de données de démonstration généré de façon **déterministe** (`src/data/seed.ts`, graine fixe dans `src/data/initialData.ts`) — utile pour explorer l'app immédiatement, sans dépendre d'une écriture localStorage préalable.

Paramètres → **Réinitialiser aux données de démonstration** remet ce même jeu de données. **Exporter/Importer** permet une sauvegarde/restauration manuelle en JSON.

## Migration future vers Firebase/Firestore

L'architecture a été pensée pour que ce changement touche uniquement la couche `src/store/`, sans toucher à l'UI :

1. Les types métier (`src/types.ts`) sont indépendants du stockage — ce sont déjà le "contrat" de données Firestore.
2. Chaque store Zustand (`studentsStore.ts`, `goalsStore.ts`, `memorizationStore.ts`) expose des actions à signature stable (`addStudent`, `updateGoal`, `removeStudent`, ...). Il suffit de remplacer le corps de ces actions par des appels `addDoc`/`updateDoc`/`deleteDoc` Firestore, et d'abonner le state local aux `onSnapshot` des collections correspondantes, en gardant exactement les mêmes noms/signatures.
3. Retirer le middleware `persist` (Firestore devient la source de vérité) et supprimer `src/data/initialData.ts` + `src/data/seed.ts` (remplacés par un import ponctuel dans Firestore, ou un script d'amorçage `firebase-admin` séparé).
4. Toute la logique de calcul (`src/lib/goalCalculations.ts`) reste inchangée : elle ne dépend que des champs `targetAmount`/`achievedAmount`, jamais du mode de stockage.

## Structure

```
src/
  types.ts              Types de domaine
  data/                  Sourates (114), données de démo
  store/                 4 stores Zustand (persist → localStorage)
  lib/                   Dates (mois marocains), calculs, constantes, CSV, export/import
  components/ui/         Composants réutilisables (boutons, cartes, modales, badges...)
  components/layout/     Sidebar, Topbar, gabarit
  components/{goals,memorization,students}/  Formulaires métier
  pages/                 8 pages + fiche élève
```

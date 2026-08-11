# كُتّاب — تطبيق تتبع الحفظ والمراجعة

Application de suivi pédagogique pour كُتّاب مسجد بوعكاز القديم (école coranique).
Chaque enseignant se connecte, choisit sa حلقة (حفظ / مراجعة / تصحيح الألواح) et gère les objectifs de cette حلقة pour l'ensemble des élèves : المطلوب، المنجز، حالة الإنجاز، التقييم، الملاحظات — calculés automatiquement.

Interface 100% arabe, RTL. Stack : React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand + React Router + Recharts.

## Lancer en local

```bash
npm install
npm run dev       # serveur de développement
npm run build     # build de production → dist/
npm run preview   # prévisualiser le build
```

## Authentification (comptes de démonstration)

Aucun vrai serveur d'authentification — c'est une vérification locale simple à but de démonstration. 3 comptes enseignants sont pré-configurés dans `src/data/teachers.ts` (mot de passe `1234` pour les trois) :

| Enseignant | Mot de passe |
|---|---|
| محمد العلوي | 1234 |
| خديجة بنسعيد | 1234 |
| يوسف الإدريسي | 1234 |

Après connexion, l'enseignant choisit sa **حلقة** pour la session (حفظ / مراجعة / تصحيح الألواح). Cette حلقة correspond exactement à un type d'objectif (`GoalType`) et détermine :
- quels objectifs il peut créer (`الأهداف`) et saisir (`تسجيل الإنجاز`)
- ce qu'affichent `لوحة التحكم`، `التلاميذ` et la fiche élève (scopés à sa حلقة)
- La page `التقارير` reste transversale : elle propose un filtre "الحلقة" (par défaut la حلقة de l'enseignant connecté, mais peut être changé vers "الكل" pour comparer).

La liste des élèves elle-même n'est **pas** cloisonnée par حلقة : tous les enseignants voient le même annuaire d'élèves, seuls leurs objectifs/résultats sont filtrés.

## Stockage des données (v1)

Toutes les données (élèves, objectifs, historique de mémorisation, paramètres, session enseignant) sont stockées dans le **localStorage** du navigateur via `zustand/persist`, dans 5 clés séparées :

- `kottab-students-v1`
- `kottab-goals-v1`
- `kottab-memorization-v1`
- `kottab-settings-v1`
- `kottab-auth-v1` (session enseignant + حلقة active)

Au tout premier lancement (aucune donnée en localStorage), l'application charge un jeu de données de démonstration généré de façon **déterministe** (`src/data/seed.ts`, graine fixe dans `src/data/initialData.ts`) — utile pour explorer l'app immédiatement, sans dépendre d'une écriture localStorage préalable.

Paramètres → **Réinitialiser aux données de démonstration** remet ce même jeu de données. **Exporter/Importer** permet une sauvegarde/restauration manuelle en JSON.

## Migration future vers Firebase/Firestore

L'architecture a été pensée pour que ce changement touche uniquement la couche `src/store/`, sans toucher à l'UI :

1. Les types métier (`src/types.ts`) sont indépendants du stockage — ce sont déjà le "contrat" de données Firestore.
2. Chaque store Zustand (`studentsStore.ts`, `goalsStore.ts`, `memorizationStore.ts`) expose des actions à signature stable (`addStudent`, `updateGoal`, `removeStudent`, ...). Il suffit de remplacer le corps de ces actions par des appels `addDoc`/`updateDoc`/`deleteDoc` Firestore, et d'abonner le state local aux `onSnapshot` des collections correspondantes, en gardant exactement les mêmes noms/signatures.
3. Retirer le middleware `persist` (Firestore devient la source de vérité) et supprimer `src/data/initialData.ts` + `src/data/seed.ts` (remplacés par un import ponctuel dans Firestore, ou un script d'amorçage `firebase-admin` séparé).
4. Toute la logique de calcul (`src/lib/goalCalculations.ts`) reste inchangée : elle ne dépend que des champs `targetAmount`/`achievedAmount`, jamais du mode de stockage.
5. `authStore.ts` devra être remplacé par Firebase Authentication (ou équivalent) ; `src/data/teachers.ts` disparaît au profit d'une vraie base d'utilisateurs avec mots de passe hachés côté serveur.

## Structure

```
src/
  types.ts              Types de domaine (dont Teacher, AuthSession, Halqa)
  data/                  Sourates (114), enseignants de démo, données de démo
  store/                 5 stores Zustand (persist → localStorage), dont authStore
  lib/                   Dates (mois marocains), calculs, constantes, CSV, export/import
  components/ui/         Composants réutilisables (boutons, cartes, modales, badges...)
  components/layout/     Sidebar, Topbar, RequireAuth, gabarit
  components/{goals,memorization,students}/  Formulaires métier
  pages/                 LoginPage + 6 pages + fiche élève
```


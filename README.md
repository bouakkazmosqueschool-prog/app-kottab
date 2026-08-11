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

## Base de données : Supabase (PostgreSQL)

L'application utilise désormais **Supabase** comme source de vérité (plus de localStorage pour les données métier — seul le mode sombre reste local à chaque navigateur). Synchronisation temps réel entre appareils via Supabase Realtime.

### Mise en place (à faire une seule fois)

1. **Créer le schéma** : ouvre `supabase/schema.sql`, colle tout son contenu dans Supabase Dashboard → SQL Editor → Run.
2. **Désactiver la confirmation d'email** : Dashboard → Authentication → Sign In / Providers → Email → décoche "Confirm email" (nécessaire car les comptes enseignants utilisent des emails techniques, pas de vraies boîtes mail).
3. **Créer les comptes enseignants** : depuis ton poste, `npm install` puis `node supabase/seed-teachers.mjs` (une seule fois).
4. **(Optionnel) Peupler avec les données de démo** : `npx tsx supabase/seed-data.ts`.
5. **Variables d'environnement** : copie `.env.example` vers `.env.local` et renseigne `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (Dashboard → Settings → API). Sur Cloudflare Pages/Workers, ajoute ces mêmes variables dans Settings → Environment variables du projet.

### Authentification

Chaque enseignant de `src/data/teachers.ts` est mappé à un email technique (ex: `abdelhaq.fadli@kottab.local`), invisible pour l'utilisateur qui ne voit que son nom arabe dans la liste déroulante de connexion. L'authentification réelle passe par **Supabase Auth** (`supabase.auth.signInWithPassword`). Le choix de la حلقة reste une décision libre à chaque connexion (pas stockée en base), donc les règles RLS autorisent tout utilisateur **authentifié** à lire/écrire — elles ne filtrent pas par حلقة (décision assumée, voir historique du projet).

### Sécurité (RLS)

Row Level Security est activé sur toutes les tables : lecture/écriture réservées aux utilisateurs connectés (`auth.role() = 'authenticated'`). Sans session valide, la clé publique (`anon`) seule ne permet ni lecture ni écriture.

### Structure des tables

- `teacher_profiles` — nom arabe lié à chaque compte `auth.users`
- `students`, `goals`, `memorization_records` — mêmes champs que les types TypeScript (`src/types.ts`), en `snake_case`
- `app_settings` — ligne unique partagée (nom du kuttab, période par défaut)

### Ajouter un nouvel enseignant

1. Ajoute `{ name, email }` dans `src/data/teachers.ts` **et** dans `supabase/seed-teachers.mjs` (les deux listes doivent rester identiques)
2. Relance `node supabase/seed-teachers.mjs`

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


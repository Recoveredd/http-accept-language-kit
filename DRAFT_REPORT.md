# DRAFT REPORT - http-accept-language-kit

Run: 2026-05-14, automatisation `fabrique-brouillons-libs`.

## Verdict

GO promotion après passe de robustesse du 2026-05-14. Le candidat retenu est un parseur/formatter diagnostique pour le header HTTP `Accept-Language`, pas un clone de matcher de locales ni un framework i18n.

Score anti-emballement: 8/10.

- Usage actuel vérifié: 2/2. `accept-language-parser` est encore cité par npm/Snyk avec environ 589k téléchargements hebdomadaires signalés par Snyk.
- Abandon ou maintenance faible: 2/2. `accept-language-parser@1.5.0` a été publié le 2018-03-20; métadonnées npm modifiées en 2022 sans nouvelle release.
- Scope livrable en 1 journée: 2/2. Header simple, parser petit, diagnostics et formatter bornés.
- Douleur utilisateur visible: 1/2. Besoin réel dans middleware, SSR et edge apps, mais souvent caché derrière des frameworks.
- Différenciation non triviale: 1/2. Différenciation utile par diagnostics et surface immutable, mais des alternatives de négociation existent.

Différenciation en 1 journée: fournir un parser/formatter `Accept-Language` browser-friendly qui expose les q-values, l'ordre source, les tokens bruts et des diagnostics stables, avec un petit `pickAcceptedLanguage` optionnel sans registre global mutable.

## Shortlist exploratoire

| Package source | Famille prometteuse | Idée clean-room | Décision |
| --- | --- | --- | --- |
| `accept-language-parser` | Headers HTTP ciblés | Parser/formatter diagnostique `Accept-Language` | GO |
| `accept-parser` | Headers HTTP `Accept-*` | Toolkit générique Accept/Accept-Language | NO GO, scope trop large et `negotiator` maintenu |
| `content-disposition-parser` | Headers HTTP fichiers | Parser Content-Disposition avec filename* | NO GO provisoire, `content-disposition` maintenu et domaine plus délicat |
| `parse-accepts` | Négociation HTTP | Inspecteur multi-header | NO GO, recouvre `accepts`/`negotiator` |
| `bcp-47` | Tags langue | Validateur BCP 47 | NO GO, standard trop large et alternatives actives |
| `cors` helpers | Browser/server helpers | Diagnostics CORS headers | NO GO, besoin serveur et domaine déjà saturé |
| `parse-duration` proches | Durées | Parseur tolérant | NO GO, déjà couvert par `human-duration-parse-kit` et `written-duration-parse-kit` |
| `query-string` proches | URL/query | Parser query diagnostique | NO GO, famille URL déjà proche et leaders maintenus |
| `mime`/`content-type` proches | MIME/content-type | Inspecteur MIME ciblé | À explorer, mais risque fort de leaders maintenus |
| petits parsers CSV/TSV | CSV edge cases | Normaliseur TSV | NO GO, trop proche `json-csv-kit`/tables |

## Preuves

Source principale: `accept-language-parser`.

- npm: version `1.5.0`, MIT, repository `git://github.com/opentable/accept-language-parser.git`.
- Dernière release publiée: `2018-03-20T17:18:26.787Z`.
- Signal d'usage: Snyk indiquait environ 589,557 téléchargements hebdomadaires au moment du sourcing.
- Douleur: les headers `Accept-Language` peuvent contenir plusieurs ranges pondérés, des q-values invalides, des wildcards et des tokens à diagnostiquer avant fallback.

## Concurrents et alternatives maintenues

- `accept-language@3.0.20`: publié en août 2024, API orientée matching avec registre de langues global.
- `negotiator@1.0.0`: publié en 2024, négociation HTTP plus large.
- `accepts@1.3.8`/`2.0.0 next`: négociation haut niveau.
- `@formatjs/intl-localematcher@0.8.7`: publié le 2026-05-12, matcher locale moderne mais pas parser diagnostique de header brut.

Raison du GO malgré ces alternatives: le brouillon ne cherche pas à remplacer les leaders de négociation. Il cible l'inspection locale et testable du header: parser, formatter, diagnostics, ordre source, q-values et helper de sélection minimal.

## Contrôle anti-doublon

Inventaire consulté:

- `/Users/guillaumepapinutti/Developer/ExperienceAlpha/docs/package-dashboard.md`
- `/Users/guillaumepapinutti/Developer/ExperienceAlpha/docs/npm-publication-queue.md`
- `/Users/guillaumepapinutti/Developer/ExperienceAlpha/Recoveredd/README.md`
- dossiers racine `*-kit`
- dossiers `draft-libs/*-kit`
- mémoire de l'automatisation, absente ou vide avant ce run

Libs proches trouvées:

- `http-cache-control-kit`: autre header HTTP, mais directives cache et promesse différente.
- `http-link-header-kit`: autre header HTTP, mais parsing de liens relationnels.
- `text-url-extract-kit`, `domain-name-validate-kit`, `github-repo-url-kit`: URL/domaines, pas négociation de langues.
- `localized-price-parse-kit`, `currency-code-symbol-kit`: internationalisation de valeurs, pas header HTTP.

Conclusion anti-doublon: ce n'est pas un doublon fonctionnel. Le domaine HTTP est partagé avec deux brouillons, mais le cas utilisateur réel change: lire, trier, diagnostiquer et reformater `Accept-Language`.

## Nom retenu

`http-accept-language-kit`.

Le nom est explicite dans une liste npm/GitHub: il indique HTTP, le header exact et le suffixe Recoveredd `-kit`. Il évite de se confondre avec `accept-language-parser`, `accept-language`, `accepts` ou `negotiator`.

## API proposée

- `parseAcceptLanguage(input, options?)`
- `formatAcceptLanguage(languages, options?)`
- `pickAcceptedLanguage(header, supportedLanguages, options?)`
- Types exportés: diagnostics, items, options et résultat de parse.

## Browser-friendly

Le coeur utilise uniquement TypeScript/JavaScript standard: chaînes, tableaux, regex et nombres. Pas de `fs`, `path`, `node:url`, `Buffer`, `process`, réseau implicite ni dépendance runtime.

## CLI

Pas de CLI dans ce brouillon. Une CLI n'ajouterait pas beaucoup de valeur à un parser destiné à middleware, workers et tests unitaires. Elle pourrait être ajoutée plus tard seulement si un vrai workflow d'audit de headers apparaît.

## Risques et limites

- Validation volontairement légère des language ranges; ce n'est pas une implémentation complète BCP 47.
- Matching volontairement simple: exact, langue de base, wildcard. Les algorithmes ECMA-402/Intl restent hors scope.
- Les wildcards produisent un diagnostic même quand elles sont acceptées, pour rendre les fallbacks visibles.
- `q` accepte les nombres décimaux simples; la compat RFC stricte peut être renforcée avant publication.

## État avant publication

Passe promotion 2026-05-14:

- Revue de l'angle face à `accept-language`, `accepts`, `negotiator` et `@formatjs/intl-localematcher`: maintien du scope inspection/diagnostics, sans prétendre remplacer une négociation complète.
- Passe utilisateur avancé 1: q-values HTTP durcies à trois décimales par défaut, avec option `allowExtendedQualityPrecision` pour imports tolérants.
- Passe utilisateur avancé 2: `pickAcceptedLanguage` ignore les langues supportées invalides avant wildcard, ce qui évite de retourner une chaîne vide.
- Passe robustesse: tests ajoutés pour qvalue trop précise, mode tolérant et wildcard avec liste supportée bruitée.
- Démo portfolio décidée: utile pour visualiser tri, diagnostics, wildcard et sélection.

## Validations

- `npm install --package-lock-only --offline`: OK après échec réseau initial du générateur.
- `npm install --offline`: OK pour restaurer `node_modules` depuis le cache local.
- `npm run typecheck`: OK.
- `npm test`: OK, 10 tests passés après passe promotion.
- `npm run build`: OK.
- `npm pack --dry-run`: échec avec le cache npm global (`EPERM` sur `~/.npm/_cacache/tmp/...`).
- `npm_config_cache=/private/tmp/http-accept-language-kit-npm-cache npm pack --dry-run`: OK, tarball virtuel de 11.3 kB, 8 fichiers.
- `npm_config_cache=.npm-cache npm pack --dry-run`: OK après passe promotion, tarball virtuel de 11.9 kB, 8 fichiers.

## Git local

Échec documenté:

- commande tentée dans le dossier du brouillon uniquement: `git init && git branch -M main && git config user.name "Recoveredd" && git config user.email "recoveredd@users.noreply.github.com" && git status --short`
- résultat: `/Users/guillaumepapinutti/Developer/ExperienceAlpha/draft-libs/http-accept-language-kit/.git: Operation not permitted`
- aucun `git add` ni `git commit` n'a été tenté après cet échec;
- aucun Git du workspace parent n'a été touché.

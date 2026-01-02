This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



## CI/CD

  ### Using semantic-release
semantic-release automates the package release workflow including: determining the next version number, generating the release notes, and publishing the package.
This removes the immediate connection between human emotions and version numbers, strictly following the  [Semantic Versioning Specification](http://semver.org/) and communicating the impact of changes to consumers.

####  MAJOR.MINOR.PATCH version numbering
Increment the:
- MAJOR version
when  making incompatible API changes,
- MINOR version
when adding functionality in a backward compatible manner,
- PATCH version
when making backward compatible bug fixes.

#### Rules for committing to development branch
| commit | release | next version | sample commit message |
|-----------|---------|--------------|-----------------------------------------------------|
| refactor: | patch | 1.0.0->1.0.1 | refactor: implement calculation method as recursion |
| fix: | patch | 1.0.0->1.0.1 | fix: add missing parameter to service call |
| docs: | patch | 1.0.0->1.0.1 | docs: update readme |
| style: | patch | 1.0.0->1.0.1 | style: update readme |
| test: | patch | 1.0.0->1.0.1 | test: update unit tes |
| build: | major | 1.0.0->2.0.0 | build: upated look file |
| ci | patch | 1.0.0->1.0.1 | ci: add new stage (integration test) |
| revert | patch | 1.0.0->1.0.1 | revert: revert to commit |
| feat: | minor | 1.0.0->1.1.0 | feat(lang): add Polish language |
| chore: | minor | 1.0.0->1.1.0 | chore: drop support for Node 6 |
| perf: | minor | 1.0.0->1.1.0 | perf: -//- |

#### Conventional Commits
- The Conventional Commits specification is a lightweight convention on top of commit messages. It provides an easy set of rules for creating an explicit commit history; which makes it easier to write automated tools on top of. This convention dovetails with SemVer, by describing the features, fixes, and breaking changes made in commit messages.

  

- The commit message should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

```

  

- The commit contains the following structural elements, to communicate intent to the consumers of your library:

  

1. fix: a commit of the type fix patches a bug in your codebase (this correlates with PATCH in Semantic Versioning).

2. feat: a commit of the type feat introduces a new feature to the codebase (this correlates with MINOR in Semantic Versioning).

3. BREAKING CHANGE: a commit that has a footer BREAKING CHANGE:, or appends a ! after the type/scope, introduces a breaking API change (correlating with MAJOR in Semantic Versioning). A BREAKING CHANGE can be part of commits of any type.

4. types other than fix: and feat: are allowed, for example @commitlint/config-conventional (based on the Angular convention) recommends build:, chore:, ci:, docs:, style:, refactor:, perf:, test:, and others.

  
  

https://www.conventionalcommits.org/en/v1.0.0/
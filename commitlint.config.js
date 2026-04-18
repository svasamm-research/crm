// Commitlint configuration — mirrors Svasamm DMS family convention.
// Docs: https://commitlint.js.org
//
// Commit format:  type(optional-scope): short subject
//
// Examples:
//   feat(brand): replace CRM logo with Svasamm mark
//   fix(footer): correct AGPL source link on mobile layout
//   chore: bump pre-commit hook versions
//   ci: add Playwright snapshot workflow

module.exports = {
	parserPreset: "conventional-changelog-conventionalcommits",
	rules: {
		"subject-empty": [2, "never"],
		"type-case": [2, "always", "lower-case"],
		"type-empty": [2, "never"],
		"type-enum": [
			2,
			"always",
			[
				"build",
				"chore",
				"ci",
				"docs",
				"feat",
				"fix",
				"perf",
				"refactor",
				"revert",
				"style",
				"test",
				"deprecate",
			],
		],
	},
}

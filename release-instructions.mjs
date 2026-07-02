// Printed by the npm `postversion` hook, after `npm version` has created the
// local version commit and tag. This script ONLY prints guidance — it never
// pushes. Pushing stays a deliberate, manual step.
const version = process.env.npm_package_version ?? "<version>";
const tag = version; // .npmrc sets tag-version-prefix="" so the tag === version
const line = "─".repeat(64);

console.log(`
${line}
  Bumped to ${version} - committed and tagged "${tag}" locally.
  Nothing has been pushed yet.

  To publish this release, push the commit and its tag together:

      git push --follow-tags

  That pushes the current branch plus the "${tag}" tag, which triggers the
  GitHub Actions workflow to build and publish the release. BRAT users then
  auto-update.

  To undo before pushing (nothing has left your machine):

      git tag -d ${tag}          # delete the local tag
      git reset --hard HEAD~1    # drop the version commit
${line}
`);

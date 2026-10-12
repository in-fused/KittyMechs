# KittyMech archive — October 12, 2026

This repository preserves the current source snapshot before removal of the local working project. It includes previously uncommitted code and documentation. It is an archive of the existing state, not a newly tested release or a reconstruction of the earlier Git history.

## Complete files and existing builds

Download the assets from the `local-archive-2026-10-12` GitHub release. Extract **all eight** `working-project-part-XX.zip` files into the same parent directory. Together they restore one `KittyMech-Web` folder with source, editable art, runtime/reference assets, tools, documentation, and the existing `dist` build. `file-manifest.json` records each archived file and its SHA-256; `SHA256SUMS.txt` records archive hashes.

`existing-live-build-062.zip` separately preserves the prior live server's working build. It is distinct from the later source snapshot. Both are retained so the previously running version is not confused with newer work.

Dependencies (`node_modules`), Git's internal object database, machine-specific hosting configuration, and bulky scratch history are excluded. Install dependencies with `npm ci` after extraction. Private credentials are not included.

## Running or rebuilding

For an existing production build, run `npm ci`, then `npm start`; the server uses the `PORT` environment variable when set. Consult the project's original README for application details.

The exact archived project includes historical storage hooks tied to the former Windows PC. In that extracted archive, use `npm --ignore-scripts run build` to run the build command without its obsolete prebuild hook. The browsable Git snapshot removes those machine-specific npm hooks; its source can use `npm run build` after restoring any required asset packages.

The original local repository and scratch copies were scheduled for deletion only after the source push and release-asset checks succeeded. Do not recreate every historical handoff or snapshot when resuming development.

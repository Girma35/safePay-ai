# SafePay AI — Local-first transaction demo

This repository contains a small React + TypeScript demo focused on privacy-first transaction storage, wallet-backed encryption, on-device classifier, and optional on-chain proof anchoring.

What I changed in this pass:

- Added a small reusable classifier helper at `src/client/lib/classifier.ts`.
- Added UI components: `Header`, `BottomNav`, and `AddTransaction` screen.
- Homepage now fetches `/mock-ipfs/sample_plain_backup.json` dynamically and shows a preview.
- Small helper CSS appended to `public/styles/theme.css` to style the new components.
- A browser-run classifier test is available at `public/mock-tests/classifier-test.html` (open in the browser and check the console).

Next steps (optional): wire a full SPA router, add unit tests with a test runner, and polish components for accessibility.
"# safePay-ai" 

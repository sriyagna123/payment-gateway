Payment Gateway — Static Demo

This is a lightweight static demo of the Payment Gateway UI (no backend). It contains three files:

- `index.html` — the demo page (forms simulate payments client-side)
- `css/style.css` — styles for the demo
- `js/main.js` — client-side simulation (validation + mock receipt)

Deploy to GitHub Pages

1. Commit & push to `main` branch, then go to GitHub repository settings -> Pages -> choose `main` branch -> `/ (root)` and Save. The site will be published at https://<your-username>.github.io/<repo-name>/ within a minute.

Or use `gh` CLI to create a `gh-pages` branch (optional):

  git checkout -b gh-pages
  git add static_site -A
  git commit -m "feat: add static site for GitHub Pages"
  git subtree push --prefix static_site origin gh-pages

Notes

- This is intentionally static and only suitable for demos and documentation. For real payments, deploy the Flask backend and connect it securely to a payment provider.
- Feel free to customize the copy and styles before publishing.
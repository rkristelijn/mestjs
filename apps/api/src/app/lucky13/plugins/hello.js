// Sample plugin for the Lucky-13 RFI-equivalent demo route (#4).
// The VULNERABILITY is in lucky13.controller.ts: loadPlugin() does
//   require('./plugins/' + name)
// with `name` taken straight from ?name=… — a user-chosen module path (the
// Node analogue of PHP include($_GET['dir'])). This benign module just gives
// the happy path something real to load so the app actually runs. Do NOT
// treat the presence of this file as "safe"; the route is still exploitable.
module.exports = {
  name: 'hello',
  run: () => ({ ok: true, from: 'lucky13 sample plugin' }),
};

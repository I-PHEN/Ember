# Guest demo access

Guest state is a separate boolean, not a fabricated Firebase user or an authenticated identity. It is restored from tab-scoped sessionStorage, and removed on sign-in/sign-out. The modal consumes and clears its pending destination before continuing; a direct studio gate keeps its existing query string. Landing and gallery entry points recognize the same guest state.

History remains localStorage-backed, so describe it as browser-only, not unsaved. Existing sign-in flows are labelled demo-only and the inaccurate encrypted-session badge is removed. Guest continuation makes no auth API call and asks for no credentials.

This is demo access, not production security. Existing endpoints need server-side authentication, usage budgets/rate limits, and reliable publication ownership before public deployment. Guest mode must never be used as authorization for privileged server actions. Gallery replay still needs saved audio and measured timing persistence.

Verification: full test suite, guest regression checks, changed-file lint, production build, and browser continuation/reload checks without submitting a paid generation request.

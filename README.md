# EOTA Genesis Scrollbook

Independent static website for eotadocumentsolutions.com.

This branch is intentionally separate from main, which powers sufferxi.com. Do not merge this branch into main or replace the existing lock-demo production deployment.

Publish this branch using a separate Cloudflare Pages project with no build command and the repository root as its output directory. Connect only eotadocumentsolutions.com and www.eotadocumentsolutions.com to that separate project. The existing Sufferxi project, routes, domain, and production branch must remain unchanged.

The reader is available at / and /scrollbook.html. All 50 chapters and 1,533 verses are embedded. It includes hold-to-read controls, bookmarks saved in the visitor's browser, a denim page, decorative lettering, and the white-fire YE shield footer.

## Complete SUFFERXI Bible draft

The main reader's BOOKS menu includes the 66-book Protestant canon (1,189
chapters; 31,102 verses). Existing Genesis and Exodus text is retained.
Leviticus through Revelation are explicitly labeled draft slang adaptations
of the public-domain KJV, matching the existing Exodus vocabulary style.
These are deterministic word/phrase adaptations, not a scholarly translation;
individual verses still need editorial review before calling this a polished
paraphrase. The visible reader note communicates this status.

New books live in `assets/sufferxi-bible/`, one JSON file per book, and load
through a parent-page bridge only when selected. The sandboxed reader retains
reading positions for each book. The source URL and SHA-256 are in the manifest.
To rebuild or verify against the original `en_kjv.json` source:

```
python scripts/build_sufferxi_bible.py /path/to/en_kjv.json
python scripts/check_sufferxi_bible.py /path/to/en_kjv.json
```

This update targets only `eota-scrollbook-site`, never `main`.

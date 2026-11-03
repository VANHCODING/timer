# csTimer scramble engine

Unmodified `cstimer_module` 0.1.5, published by cs0x7f.

- Package: https://registry.npmjs.org/cstimer_module/-/cstimer_module-0.1.5.tgz
- Package SHA-512 (base64): `5vAYZEnMOjk6iExR9b8eY6XzDpJoKP4HKCD0FhBKpNIzQoxj3foGEVjmQCZsgFU3nuAewTlP6ULcZxvqFyCDJg==`
- Corresponding source: https://github.com/cs0x7f/cstimer/tree/89e884749d56d37b81cb15410504c3b9e8251b3b
- Build and usage: https://github.com/cs0x7f/cstimer/blob/89e884749d56d37b81cb15410504c3b9e8251b3b/npm_export/README.md
- Upstream license: GPL-3.0, included as `LICENSE`; package metadata is retained in `package.json`.

The app runs the upstream bundle directly as a Web Worker using its documented
message protocol. Mappings: `222` -> `222so`, `333` -> `333`, `444` -> `444wca`.
The client supplies 256 bits from `crypto.getRandomValues` as the initial seed.
No random-move fallback is provided on loading or generation errors.

This is a practice timer using csTimer's WCA-event scramble types, not the
WCA-approved competition scramble distribution system. Do not describe this app
as WCA-certified or use it to generate official competition scrambles.

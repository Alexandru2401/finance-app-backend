# API Routes Documentation

Toate rutele sunt prefixate cu `{BASE_PATH}`.

Autentificarea se face prin cookie-uri `httpOnly` (`accessToken` și `refreshToken`), setate la login/register. Rutele marcate cu 🔒 necesită un `accessToken` valid.

## Cuprins

- [Budget](#budget)
  - [POST /budget/summary]()
  - [POST /auth/login](#post-authlogin)
  - [POST /auth/refresh](#post-authrefresh)
  - [POST /auth/logout](#post-authlogout)
  - [GET /auth/user-info](#get-authuser-info)
  - [PATCH /auth/user-info](#patch-authuser-info)

---

## Budget

### GET /budget/summary

Returneaza summary pt luna curenta

## Parametrii:

| Query param | Valori | Default |
|---|---|---|
| `period` | `this-month`, `last-month`, `last-3`, `last-6`, `last-12` | `this-month` |
| | `YYYY-MM:YYYY-MM` (luni întregi, ex. `2026-01:2026-03`) | |
| | `YYYY-MM-DD:YYYY-MM-DD` (zile, ex. `2026-01-15:2026-03-10`) | |

- `last-3`, `last-6`, `last-12` includ luna curentă (`last-3` = luna curentă + 2 luni dinainte).
- La intervalul custom ambele capete sunt incluse și trebuie să aibă același format. Maxim 10 ani.
- Orice altă valoare dă `400 Invalid period`.

`net` = `income` - `expense` (economiile nu se scad). La fel și `target.net`.

## Response 
```json
{
    "success": true,
    "summary": {
        "income": 0,
        "expense": 0,
        "savings": 0,
        "net": 0,
        "target": {
            "income": null,
            "expense": null,
            "savings": null,
            "net": null
        },
        "progress": {
            "income": null,
            "expense": null,
            "savings": null,
            "net": null
        }
    }
}
```

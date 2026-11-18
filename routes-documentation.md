# API Routes Documentation

Toate rutele sunt prefixate cu `{BASE_PATH}`.

Autentificarea se face prin cookie-uri `httpOnly` (`accessToken` și `refreshToken`), setate la login/register. Rutele marcate cu 🔒 necesită un `accessToken` valid.

## Cuprins
npx supabase migration list
- [Auth](#auth)
  - [POST /auth/register](#post-authregister)
  - [POST /auth/login](#post-authlogin)
  - [POST /auth/refresh](#post-authrefresh)
  - [POST /auth/logout](#post-authlogout)
  - [GET /auth/user-info](#get-authuser-info)
  - [PATCH /auth/user-info](#patch-authuser-info)
  - [DELETE /auth/data](#delete-authdata)
  - [DELETE /auth/account](#delete-authaccount)
- [Budget](#budget)
  - [GET /budget/health](#get-budgethealth)
  - [GET /budget/costs](#get-budgetcosts)
  - [GET /budget/forecast](#get-budgetforecast)
- [Recurring](#recurring)
  - [GET /recurring](#get-recurring)
  - [POST /recurring](#post-recurring)
  - [PATCH /recurring/:id](#patch-recurringid)
  - [DELETE /recurring/:id](#delete-recurringid)

---

## Auth

### POST /auth/register

Creează un cont nou, cu cele 12 categorii de pornire, și setează cookie-urile de autentificare.

**Request body**

`language` este opțional (`ro` sau `en`, implicit `ro`) și stabilește limba contului și a categoriilor.

```json
{
  "email": "",
  "password": "",
  "language": "ro"
}
```

**Response** `201 Created`

```json
{
  "success": true,
  "message": "User successfully created",
  "user": {
    "user_id": "6bee845c-9902-4cd4-a8b8-1ca79e42d8ca",
    "username": null,
    "email": "test-nou@test.com",
    "plan_type": "free",
    "is_active": true,
    "created_at": "2026-10-30T04:20:54.505Z"
  }
}
```

---

### POST /auth/login

Autentifică userul și setează cookie-urile de autentificare.

**Request body**

```json
{
  "email": "test-nou@test.com",
  "password": "test"
}
```

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "user_id": "6bee845c-9902-4cd4-a8b8-1ca79e42d8ca",
    "username": "test",
    "email": "test-nou@test.com",
    "plan_type": "free",
    "created_at": "2026-11-06T10:00:00.000Z",
    "language": "ro",
    "currency": "RON"
  }
}
```

---

### POST /auth/refresh

Emite un `accessToken` nou. Fără body, token-ul e luat din cookie-ul `refreshToken`.

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Token refreshed"
}
```

---

### POST /auth/logout

Închide sesiunea și șterge cookie-urile. Fără body, token-ul e luat din cookie-ul `refreshToken`, deci funcționează și după expirarea `accessToken`-ului.

**Response** `204 No Content`

Fără body. Răspunsul e același și dacă nu există o sesiune activă (logout-ul e idempotent).

---

### GET /auth/user-info

🔒 Întoarce profilul userului logat. Userul e identificat din cookie.

**Response** `200 OK`

```json
{
  "success": true,
  "user": {
    "user_id": "6bee845c-9902-4cd4-a8b8-1ca79e42d8ca",
    "username": null,
    "email": "test-nou@test.com",
    "plan_type": "free",
    "is_active": true,
    "created_at": "2026-10-30T04:20:54.505Z",
    "language": "ro",
    "currency": "RON",
    "has_completed_onboarding": true,
    "completed_tours": ["overview"]
  }
}
```

`completed_tours` are paginile (`overview`, `budget`, `transactions`, `analytics`, `settings`) al căror tur ghidat userul l-a terminat sau sărit.

---

### PATCH /auth/user-info

🔒 Actualizează profilul userului logat. Câmpurile sunt opționale, dar trebuie trimis cel puțin unul; cele lipsă își păstrează valoarea. Sumele se convertesc doar când `currency` diferă de moneda curentă.

**Request body**

```json
{
  "username": "test",
  "currency": "RON",
  "language": "ro"
}
```

`"completeTour": "budget"` (singur sau cu alte câmpuri) adaugă pagina în `completed_tours`, o singură dată; alte valori decât paginile de mai sus dau `400`. Nu se poate anula.

**Response** `200 OK`

```json
{
  "success": true,
  "user": {
    "user_id": "6bee845c-9902-4cd4-a8b8-1ca79e42d8ca",
    "username": "test",
    "currency": "RON",
    "language": "ro"
  }
}
```

---

### DELETE /auth/data

🔒 **Reset Data.** Șterge definitiv tranzacțiile, țintele, tranzacțiile recurente, notificările și categoriile userului, apoi adaugă din nou cele 12 categorii de pornire, în limba contului. Contul, setările și sesiunea rămân. Totul se face într-o singură tranzacție DB. Limită: 5 cereri / 15 min.

**Request body**

```json
{ "password": "parola-curenta" }
```

**Response** `204 No Content`

**Erori:** `400` („Password is required” / „Password is incorrect”; 400 și nu 401, ca FE-ul să nu încerce un refresh de token), `404` (userul nu există).

---

### DELETE /auth/account

🔒 **Delete Account.** Șterge definitiv userul, toate datele lui (ca la `DELETE /auth/data`) și toate sesiunile (`refresh_tokens`), într-o singură tranzacție DB, apoi șterge cookie-urile `accessToken` și `refreshToken`. Limită: 5 cereri / 15 min.

**Request body**

```json
{ "password": "parola-curenta" }
```

**Response** `204 No Content`

**Erori:** `400` („Password is required” / „Password is incorrect”), `404` (userul nu există).

---

## Budget

### GET /budget/health

🔒 **Budget Health**: scorul 0–100 după regulile din `../analitycs.md`. Limită: 300 de cereri / 15 min (comună cu restul `/budget`).

**Query:** `today=YYYY-MM-DD` (opțional): ziua userului, ca luna curentă să nu fie cea UTC. Fără el, ziua de azi din România.

**Response** `200 OK`

```json
{
  "success": true,
  "health": {
    "score": 72,
    "label": "good",
    "components": [
      { "key": "trend", "points": 8, "max": 20, "values": { "projection": 3600, "average": 3000, "deltaPct": 15 } },
      { "key": "pace", "points": 26.3, "max": 35, "values": { "spent": 1700, "base": 3000, "expected": 1600, "fromTarget": false, "pace": 1.06 } },
      { "key": "savingsRate", "points": 20, "max": 25, "values": { "ratePct": 16, "goalPct": 20, "fromTarget": false, "noIncome": false } },
      { "key": "positiveMonths", "points": 20, "max": 20, "values": { "positive": 3, "months": 3 } }
    ],
    "month": "2026-11",
    "day": 16
  }
}
```

- `label`: `excellent` (80–100), `good` (60–79), `warning` (40–59), `risk` (0–39).
- `components`: cele mai problematice primele (cele mai multe puncte pierdute). `values` = cifrele din care FE construiește propoziția (tradusă).
- `score: null`, `label: null`, `components: []` = nu există încă o lună completă cu tranzacții.
- În primele 5 zile din lună lipsesc `pace` și `trend`; scorul se rescalează la 100.

**Erori:** `400` (`today` invalid).

---

### GET /budget/costs

🔒 **Costuri fixe și variabile** (pagina Analytics). Limită: comună cu restul `/budget`.

**Query:** `period` (opțional, ca la `/budget/summary`; implicit luna curentă). Valori: `this-month`, `last-month`, `last-3`, `last-6`, `last-12`, `all`, `YYYY-MM:YYYY-MM`, `YYYY-MM-DD:YYYY-MM-DD`.

**Response** `200 OK`

```json
{
  "success": true,
  "costs": {
    "fixed": {
      "items": [
        { "recurring_id": "0b7c3f0e-…", "category_id": "5f0f8a3e-…", "category": "Locuință", "amount": 1200, "pct": 80 },
        { "recurring_id": "1a2b3c4d-…", "category_id": "6a1b2c3d-…", "category": "Internet", "amount": 300, "pct": 20 }
      ],
      "total": 1500
    },
    "variable": {
      "items": [
        { "category_id": "7b2c3d4e-…", "category": "Mâncare", "amount": 950.5, "pct": 100 }
      ],
      "total": 950.5
    }
  }
}
```

- `fixed`: regulile recurente **active** de cheltuieli, cea mai mare prima. Nu depind de `period`.
- `variable`: cele mai mari 5 categorii de cheltuieli din `period`, fără categoriile cu regulă recurentă activă. `category_id` și `category` sunt `null` pentru tranzacțiile cu categoria ștearsă.
- `pct`: cota rândului din `total` (0–100, întreg). `total` = suma rândurilor din listă.

**Erori:** `400` (`period` invalid).

---

### GET /budget/forecast

🔒 **Economii + prognoză** (pagina Analytics). Limită: comună cu restul `/budget`.

**Query:**
- `period` (opțional, ca la `/budget/budget-trend`; implicit `last-6`);
- `ahead` (opțional, întreg 1–12, implicit 3): câte luni de prognoză.

**Response** `200 OK`

```json
{
  "success": true,
  "forecast": {
    "points": [
      { "month": "2026-10", "savings": 400, "forecast": null },
      { "month": "2026-11", "savings": 500, "forecast": 500 },
      { "month": "2026-12", "savings": null, "forecast": 433.33 }
    ],
    "average": 433.33
  }
}
```

- Câte un punct pentru fiecare lună din `period` (economiile = tranzacțiile `savings`), apoi `ahead` luni de prognoză.
- Prognoza = media economiilor din ultimele 3 luni ale intervalului (`average`).
- `forecast` e setat și pe ultima lună reală (egal cu `savings`), ca linia de prognoză să pornească de acolo; pe lunile de prognoză `savings` e `null`.
- Fără nicio lună: `points: []`, `average: null`.

**Erori:** `400` (`period` sau `ahead` invalid).

---

## Recurring

Regulile după care o tranzacție se adaugă automat în fiecare lună (vezi `../notification.md`). Toate rutele sunt 🔒. Limită: 100 de cereri / 15 min per user.

Obiectul `recurring`:

```json
{
  "id": "0b7c3f0e-2a1d-4a52-9d0e-6f1f2b9a7c11",
  "type": "expenses",
  "category_id": "5f0f8a3e-1c2b-4d7a-9e3f-2a1b0c9d8e7f",
  "category_name": "Locuință",
  "amount": 1200,
  "notes": "Chirie",
  "day_of_month": null,
  "next_run": "2026-12-01",
  "is_active": true,
  "created_at": "2026-11-16T10:00:00.000Z",
  "updated_at": "2026-11-16T10:00:00.000Z"
}
```

- `day_of_month: null` = ziua 1. Zilele 29–31 cad pe ultima zi în lunile mai scurte.
- `next_run` = următoarea dată la care se generează tranzacția, calculată pe ziua din România. E mereu în viitor; nu se generează nimic retroactiv.

---

### GET /recurring

🔒 Regulile userului: întâi cele active, apoi după `next_run`.

**Response** `200 OK`

```json
{ "success": true, "recurring": [ { "...": "obiectul de mai sus" } ] }
```

---

### POST /recurring

🔒 Creează o regulă și, dacă se trimite `date`, și prima tranzacție, legată de regulă (`recurring_id`). Formularul din FE trimite mereu `date`, deci face o singură cerere. Regula și tranzacția se salvează împreună: dacă una eșuează, nu se salvează niciuna.

**Request body**

```json
{
  "type": "expenses",
  "category_id": "5f0f8a3e-1c2b-4d7a-9e3f-2a1b0c9d8e7f",
  "amount": 1200,
  "notes": "Chirie",
  "day_of_month": 15,
  "date": "2026-11-16"
}
```

- `type`, `category_id`, `amount` sunt obligatorii; categoria trebuie să fie a userului și de același tip.
- `notes` e opțional (maxim 1500 de caractere).
- `day_of_month` e opțional: lipsă sau `null` = 1 a lunii următoare; altfel întreg 1–31.
- `date` e opțional (`YYYY-MM-DD`): data primei tranzacții. Dacă e în viitor, `next_run` se calculează după ea, ca aceeași zi să nu fie adăugată de două ori.

**Response** `201 Created`

```json
{
  "success": true,
  "recurring": { "...": "obiectul creat" },
  "transaction": {
    "item_id": "9a1c2b3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "type": "expenses",
    "category_id": "5f0f8a3e-1c2b-4d7a-9e3f-2a1b0c9d8e7f",
    "category_name": "Locuință",
    "amount": 1200,
    "date": "2026-11-16",
    "notes": "Chirie",
    "recurring_id": "0b7c3f0e-2a1d-4a52-9d0e-6f1f2b9a7c11",
    "created_at": "2026-11-16T10:00:00.000Z"
  }
}
```

`transaction` apare doar când s-a trimis `date`.

**Erori:** `400` (câmp lipsă sau invalid, categorie de alt tip), `404` (categoria nu există / nu e a userului), `409` (categoria are deja o regulă: „This category already has a recurring item”), `422` (`code: "LIMIT_REACHED"`: peste 50 de reguli sau, cu `date`, peste 20.000 de tranzacții).

O categorie are **cel mult o regulă**. Ștergerea categoriei șterge și regula ei; tranzacțiile adăugate deja rămân.

---

### PATCH /recurring/:id

🔒 Modifică o regulă; se trimite cel puțin un câmp. Schimbările afectează doar tranzacțiile viitoare.

**Request body** (oricare din câmpuri)

```json
{
  "type": "expenses",
  "category_id": "5f0f8a3e-1c2b-4d7a-9e3f-2a1b0c9d8e7f",
  "amount": 1250,
  "notes": null,
  "day_of_month": 5,
  "is_active": false
}
```

- `notes: null` sau `""` șterge nota.
- `day_of_month` schimbat recalculează `next_run` de azi.
- `is_active: false` pune pe pauză. `is_active: true` reia regula și recalculează `next_run` de azi, fără să genereze lunile din pauză.

**Response** `200 OK`

```json
{ "success": true, "recurring": { "...": "obiectul actualizat" } }
```

**Erori:** `400`, `404` (regula sau categoria nu există / nu e a userului), `409` (`category_id` nou are deja o regulă).

---

### DELETE /recurring/:id

🔒 Șterge regula. Tranzacțiile generate deja rămân, fără legătură cu regula (`recurring_id` devine `null`).

**Response** `204 No Content`

**Erori:** `404`.

---

## Notifications

Notificările din aplicație (vezi `../notification.md`). Toate rutele sunt 🔒. Limită: 300 de cereri / 15 min per user (clopoțelul cere numărul la fiecare minut).

Obiectul `notification`:

```json
{
  "id": "3c2b1a0f-9e8d-4c7b-a6f5-e4d3c2b1a0f9",
  "type": "recurring_added",
  "data": {
    "recurring_id": "0b7c3f0e-2a1d-4a52-9d0e-6f1f2b9a7c11",
    "item_id": "9a1c2b3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "type": "expenses",
    "amount": 1200,
    "category": "Locuință",
    "date": "2026-12-01"
  },
  "read_at": null,
  "created_at": "2026-12-01T00:05:00.000Z"
}
```

- `type`: `recurring_added` (s-a generat o tranzacție), `recurring_upcoming` (urmează una), `recurring_paused`.
- `data` conține valorile, nu textul: FE-ul traduce și formatează suma în moneda userului.
- `read_at: null` = necitită.

---

### GET /notifications

🔒 Lista paginată, cele mai noi primele.

**Query:** `page` (implicit 1), `limit` (implicit 20, maxim 50), `unread=true` (doar necitite).

**Response** `200 OK`

```json
{
  "success": true,
  "notifications": [ { "...": "obiectul de mai sus" } ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### GET /notifications/unread-count

🔒 Numărul de notificări necitite (badge-ul de pe clopoțel).

**Response** `200 OK`

```json
{ "success": true, "count": 3 }
```

---

### PATCH /notifications/:id/read

🔒 Marchează o notificare ca citită. Fără body. Idempotent: `204` și dacă era deja citită (`read_at` rămâne cel de la prima citire).

**Response** `204 No Content` · **Erori:** `404`.

---

### PATCH /notifications/read-all

🔒 Marchează ca citite toate notificările userului. Fără body.

**Response** `204 No Content`

---

### DELETE /notifications/:id

🔒 Șterge o notificare.

**Response** `204 No Content` · **Erori:** `404`.

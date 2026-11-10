# API Routes Documentation

Toate rutele sunt prefixate cu `{BASE_PATH}`.

Autentificarea se face prin cookie-uri `httpOnly` (`accessToken` și `refreshToken`), setate la login/register. Rutele marcate cu 🔒 necesită un `accessToken` valid.

## Cuprins

- [Auth](#auth)
  - [POST /auth/register](#post-authregister)
  - [POST /auth/login](#post-authlogin)
  - [POST /auth/refresh](#post-authrefresh)
  - [POST /auth/logout](#post-authlogout)
  - [GET /auth/user-info](#get-authuser-info)
  - [PATCH /auth/user-info](#patch-authuser-info)

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
    "currency": "RON"
  }
}
```

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

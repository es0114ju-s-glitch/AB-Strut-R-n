# AB Strut & Rån – Webb-beställningssystem

En B2B e-handelssida för AB Strut & Rån, byggd med **Node.js**, **Express.js** och **EJS** enligt **MVC-arkitekturen**.

Projektet är designat som ett läroexempel för universitetsstudenter inom webbutveckling — varje fil innehåller kommentarer som förklarar vad koden gör och **varför** det är strukturerat på det sättet.

---

## Hur du kör projektet

### 1. Installera beroenden

```bash
npm install express ejs express-session
```

### 2. Starta servern

```bash
node app.js
```

Eller med auto-reload vid filändring (Node.js 18+):

```bash
node --watch app.js
```

### 3. Öppna i webbläsaren

| Sida | URL |
|---|---|
| Startsida | http://localhost:3000 |
| Produkter | http://localhost:3000/products |
| Kundvagn | http://localhost:3000/cart |
| Mina ordrar | http://localhost:3000/orders |
| **Admin** | http://localhost:3000/admin |

---

## Admin-inloggning (Version 1)

- Login-sida: `GET /admin/login`
- Lösenord: `strutraan2024`
- Admin logout: `GET /admin/logout`

Obs: Detta är en enkel demonstrationslösning med hårdkodat lösenord för utbildningssyfte.

---

## MVC-mappstruktur

```
/ab-strut-ran
│
├── app.js              ← Startpunkt: Express-konfiguration och middleware
├── routes.js           ← Alla URL-routes definierade på ett ställe
├── package.json        ← Projektinfo och paketlista
│
├── /controllers        ← CONTROLLER: Logic-lagret (vad ska hända?)
│   ├── homeController.js
│   ├── productController.js
│   ├── cartController.js
│   └── orderController.js
│
├── /models             ← MODEL: Data-lagret (hur hämtar vi data?)
│   ├── productModel.js
│   └── orderModel.js
│
├── /views              ← VIEW: Presentationslagret (vad ser användaren?)
│   ├── home.ejs
│   ├── products.ejs
│   ├── product-detail.ejs
│   ├── cart.ejs
│   ├── checkout.ejs
│   ├── confirmation.ejs
│   ├── orders.ejs
│   ├── admin.ejs
│   ├── 404.ejs
│   └── /partials
│       ├── header.ejs  ← Navbar (inkluderas på alla sidor)
│       └── footer.ejs  ← Footer (inkluderas på alla sidor)
│
├── /public             ← Statiska filer som serveras direkt till webbläsaren
│   └── /css
│       └── custom.css
│
└── /data               ← JSON "databas"-filer
    ├── products.json   ← 12 produkter
    └── orders.json     ← Börjar tom, fylls på vid beställningar
```

---

## Sidor och funktioner

### 1. Startsida (`GET /`)
- Hero-banner med välkomsttext på svenska
- "Veckans erbjudanden" — en produkt per kategori
- Bootstrap navbar som kollapsar till hamburger-meny på mobil
- Snabblänkar till produkter och orderhistorik

### 2. Produktsida (`GET /products`)
- Responsivt produktgrid (3 kol skrivbord, 2 tablet, 1 mobil)
- Kategorifilterknappar (Strutar / Rån / Bägare / Glassmaskiner)
- Filtret fungerar med JavaScript utan sidladdning
- Lagerstatus-badge: grön / gul / röd

### 3. Produktdetaljsida (`GET /products/:id`)
- Fullständig produktinfo
- Storlek-dropdown för Strutar (16 storlekar, 45–120mm)
- Storlek + vinkel-dropdown för Rån
- Lägg-i-kundvagn-formulär

### 4. Kundvagn (`GET /cart`)
- Responsiv tabell (scrollar horisontellt på mobil)
- Ta bort-knapp per rad
- Totalpris

### 5. Kassa (`GET /checkout`, `POST /checkout`)
- Responsivt formulär (helbred på mobil)
- Kryssruta för "Samma fakturaadress"
- Sparar order till `orders.json`
- Omdirigerar till bekräftelsesidan

### 6. Orderbekräftelse (`GET /confirmation/:orderId`)
- Tackar kunden på svenska
- Fullständig orderöversikt
- Beräknat leveransdatum

### 7. Orderhistorik (`GET /orders?customer=KUNDNUMMER`)
- Kunden söker med sitt kundnummer
- Visar alla tidigare ordrar
- Färgkodade statusbadgar
- Expanderbar orderdetaljer (Bootstrap accordion)
- **"Beställ igen"-knapp** — lägger om hela ordern i kundvagnen

### 8. Admin (`GET /admin`)
- Visar alla ordrar i systemet
- Dropdown per order för att uppdatera leveransstatus
- Kunder ser uppdaterad status direkt på /orders

---

## B2B-specifika funktioner

### "Beställ igen" (Repeat Order)
Löser ett verkligt affärsproblem: kioskkunder ringer ofta och säger *"Vi vill ha likadana som förra gången"*. Med "Beställ igen"-knappen kopieras hela den gamla ordern till kundvagnen på ett klick.

### Lagerstatus i realtid
Tidigare var priser och lagernivåer inaktuella, vilket tvingade kunder att ringa. Nu visas alltid aktuell information direkt på webbplatsen.

### Responsiv design för mobil och surfplatta
Kioskkunder beställer ofta från telefon eller surfplatta under arbetsdagen. Alla knappar är extra stora (`btn-lg`) för enklare tryckning — även med handskar.

---

## Tekniska noter

- **Sessioner**: Kundvagnen lagras i `express-session` (server-minnet). Den försvinner när servern startas om. En produktionssajt skulle använda en persistent session-store (t.ex. Redis eller en databas).
- **JSON-databas**: Enkel och utan konfiguration — perfekt för inlärning. Byt ut `productModel.js` och `orderModel.js` mot databasanrop för att uppgradera.
- **Admin-inloggning (V1)**: `/admin` skyddas med session och hårdkodat lösenord. I en riktig sajt bör lösenord hash:as (bcrypt) och lagras säkert i databas.

---

## Nödvändiga paket

```
express         — Webbframework för Node.js
ejs             — Templating-motor (EJS = Embedded JavaScript)
express-session — Session-hantering för kundvagnen
```

Inga andra externa beroenden behövs.

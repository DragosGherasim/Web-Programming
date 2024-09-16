const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs').promises;
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const favicon = require('serve-favicon');

const app = express();
const port = 6789;
const uri = "mongodb+srv://root:eliza@pw.vn2rjqj.mongodb.net/?retryWrites=true&w=majority&appName=PW";

const failedLoginAttempts = {};
const failedLoginBlockDuration = 5 * 1000 // 15 sec
const maxLoginAttempts = 5;

const failedAccessAttempts = {};
const accessAttempsBlockDuration = 5 * 1000 // 15 sec
const maxAttempts = 5;

let listaIntrebari;
let accesRezChestionar = false;
let utilizatori = [];

app.set('view engine', 'ejs');
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico'))); 
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

const resetFailedAttempts = () => {
    const currentTime = Date.now();

    for (const ip in failedAccessAttempts) {
        if (failedAccessAttempts[ip].isBlocked === true &&
                currentTime - failedAccessAttempts[ip].lastFailedAttemp > accessAttempsBlockDuration) {
            delete failedAccessAttempts[ip];
        }
    }

    for (const ip in failedLoginAttempts) {
        if (failedLoginAttempts[ip].isBlocked === true &&
                currentTime - failedLoginAttempts[ip].lastFailedAttemp > failedLoginBlockDuration) {
            delete failedLoginAttempts[ip];
        }
    }
};

setInterval(resetFailedAttempts, 5 * 1000);

app.use((req, res, next) => {
    const userIP = req.ip;

    if ((failedAccessAttempts[userIP] && failedAccessAttempts[userIP].isBlocked === true) || 
            ( failedLoginAttempts[userIP] && failedLoginAttempts[userIP].isBlocked === true)){
        return res.status(403).send('<h3>Acces interzis temporar din cauza încercărilor repetate nereușite.</h3>');
    }

    next();
});

app.use((req, res, next) => {
    res.on('finish', () => {
        if (res.statusCode === 404 && req.session.utilizator.rol === 'ADMIN') {
            const userIP = req.ip;
            
            if (!failedAccessAttempts[userIP]) {
                failedAccessAttempts[userIP] = { count: 0, lastFailedAttemp: null, isBlocked: false };
            }

            failedAccessAttempts[userIP].count++;

            if (failedAccessAttempts[userIP].count >= maxAttempts) {
                failedAccessAttempts[userIP].lastFailedAttemp = Date.now();
                failedAccessAttempts[userIP].isBlocked = true;
                failedAccessAttempts[userIP].count = 0;
            }
        }
    });

    next();
});

fs.readFile('utilizatori.json', 'utf8')
    .then(data => {
        utilizatori = JSON.parse(data);
    })
    .catch(err => console.error('Eroare la citirea fișierului utilizatori.json:', err));

app.get('/', async (req, res) => {
    const client = new MongoClient(uri);

    let isAuthenticated = false;
    let numeUtilizator = '';
    let rolUtilizator = '';

    if (req.session.utilizator) {
        isAuthenticated = true;
        numeUtilizator = `${req.session.utilizator.nume} ${req.session.utilizator.prenume}`;
        rolUtilizator = req.session.utilizator.rol;
    }

    try {
        await client.connect();
        const database = client.db('cumparaturi');
        const produse = await database.collection('produse').find({}).toArray();
        res.render('index', { isAuthenticated, numeUtilizator, rolUtilizator, produse });
    } catch (e) {
        res.status(500).send('<h1>Eroare la conectarea la baza de date.</h1>');
    } finally {
        await client.close();
    }
});

app.get('/autentificare', (req, res) => {
    if (req.session.utilizator) {
        return res.status(403).send('<h3>Sunteţi deja logat!</h3>');
    }
    
    res.render('autentificare', { mesajEroare: req.session.mesajEroare });
});

app.post('/verificare-autentificare', (req, res) => {
    const { utilizator, parola } = req.body;
    const utilizatorGasit = utilizatori.find(u => u.username === utilizator && u.parola === parola);

    const userIP = req.ip;

    if (utilizatorGasit) {
        req.session.utilizator = {
            username: utilizatorGasit.username,
            nume: utilizatorGasit.nume,
            prenume: utilizatorGasit.prenume,
            rol: utilizatorGasit.rol
        };

        delete failedLoginAttempts[userIP];
        res.redirect('/');
    } else {
        if (!failedLoginAttempts[userIP]) {
            failedLoginAttempts[userIP] = { count: 0, lastFailedAttemp: null, isBlocked: false };
        }

        failedLoginAttempts[userIP].count++;
        if (failedLoginAttempts[userIP].count >= maxLoginAttempts) {
            failedLoginAttempts[userIP].lastFailedAttemp = Date.now();
            failedLoginAttempts[userIP].isBlocked = true;
            failedLoginAttempts[userIP].count = 0;
        }

        req.session.mesajEroare = 'Numele de utilizator sau parola sunt incorecte.';
        res.redirect('/autentificare');
    }
});

app.get('/delogare', (req, res) => {
    if (!req.session.utilizator) {
        return res.status(403).send('<h3>Nu sunteţi logat!</h3>');
    }

    req.session.destroy((err) => {
        if (err) {
            res.status(500).send('Eroare la delogare. Vă rugăm să încercați din nou.');
        } else {
            res.redirect('/'); 
        }
    });
});

app.get('/chestionar', async (req, res) => {
    if (!req.session.utilizator || req.session.utilizator.rol === 'ADMIN') {
        res.status(403).send('<h3>Access interzis!</h3>');
    }

    try {
        const intrebariJSON = await fs.readFile('intrebari.json', 'utf8');
        listaIntrebari = JSON.parse(intrebariJSON);

        accesRezChestionar = true;
        res.render('chestionar', { intrebari: listaIntrebari });
    } catch (err) {
        res.status(500).send('<h1>Eroare la încărcarea chestionarului. Vă rugăm să reveniți mai târziu.</h1>');
    }
});

app.post('/rezultat-chestionar', (req, res) => {
    if (accesRezChestionar === false){
        res.status(403).send('<h3>Acces interzis!</h3>');
    }

    const raspunsuriUtilizator = req.body;
    let numarRaspunsuriCorecte = 0;

    listaIntrebari.forEach((intrebare, index) => {
        let raspunsCorect = intrebare.variante[intrebare.corect];
        let raspunsUtilizator = raspunsuriUtilizator[`raspuns${index}`];

        if (raspunsUtilizator === raspunsCorect) {
            numarRaspunsuriCorecte++;
        }
    });

    res.render('rezultat-chestionar', {
        intrebari: listaIntrebari, 
        numarCorecte: numarRaspunsuriCorecte
    });
});

app.post('/adaugare-cos', (req, res) => {
    if (!req.session.utilizator) {
        return res.status(403).send('<h3>Trebuie să fiți autentificat pentru a adăuga produse în coș.</h3>');
    }

    if (req.session.utilizator.rol === 'ADMIN') {
        return res.status(403).send('<h3>Nu Trebuie să fiți autentificat ca admin pentru a adăuga produse în coş.</h3>');
    }

    const idProdus = req.body.id;

    if (!req.session.cosCumparaturi) {
        req.session.cosCumparaturi = {};
    }

    if (!req.session.cosCumparaturi[idProdus]) {
        req.session.cosCumparaturi[idProdus] = 1;
    } else {
        req.session.cosCumparaturi[idProdus]++;
    }

    res.send('<script>alert("Produsul a fost adaugat in cos cu succes!"); window.location.href = "/";</script>');
});

app.get('/vizualizare-cos', async (req, res) => {
    if (!req.session.utilizator || req.session.utilizator.rol === 'ADMIN'){
        res.status(403).send('<h3>Acces interzis!<h3>');
    }

    if (!req.session.cosCumparaturi) {
        req.session.cosCumparaturi = {};
    }

    const cosProduseIds = Object.keys(req.session.cosCumparaturi);

    if (cosProduseIds.length === 0) {
        res.render('vizualizare-cos', { produse: [] });
        return;
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('cumparaturi');

        const detaliiProduseCos = await database.collection('produse').find({ _id: { $in: cosProduseIds.map(id => parseInt(id)) } }).toArray();

        const detaliiExtinseProduseCos = detaliiProduseCos.map(produs => {
            return {
                ...produs,
                quantity: req.session.cosCumparaturi[produs._id.toString()]
            };
        });

        res.render('vizualizare-cos', { produse: detaliiExtinseProduseCos });
    } catch (e) {
        console.error(e);
        res.status(500).send('<h1>Eroare la conectarea la baza de date</h1>');
    } finally {
        await client.close();
    }
});

app.get('/admin', (req, res) => {
    if (req.session.utilizator && req.session.utilizator.rol === 'ADMIN') {
        res.render('admin');
    } else {
        res.status(403).send('<h3>Acces interzis!</h3>');
    }
});

app.get('/admin/creare-bd', async (req, res) => {
    if (!req.session.utilizator || req.session.utilizator.rol === 'USER') {
        return res.status(403).send('<h3>Acces interzis!</h3>');
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();

        const database = client.db('cumparaturi');

        const collections = await database.listCollections({ name: 'produse' }).toArray();

        if (collections.length > 0) {
            res.send('<script>alert("Colecția \'produse\' există deja! V-ați conectat cu succes la baza de date \'cumparaturi\'"); window.location.href = "/";</script>');
        } else {
            await database.createCollection('produse');

            res.send('<script>alert("Colecția \'produse\' a fost creată cu succes!");</script>');
        }

    } catch (e) {
        console.error(e);
        res.send('<script>alert("Eroare la conectarea la baza de date sau la crearea colecției!"); window.location.href = "/";</script>');
    } finally {
        await client.close();
    }
});

app.get('/admin/inserare-bd', async (req, res) => {
    if (!req.session.utilizator || req.session.utilizator.rol === 'USER') {
        return res.status(403).send('<h3>Acces interzis!</h3>');
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();

        const database = client.db('cumparaturi');

        const products = [
            { _id: 1, name: 'iPhone 13', brand: 'Apple', price: 799 },
            { _id: 2, name: 'Galaxy S21', brand: 'Samsung', price: 699 },
            { _id: 3, name: 'Pixel 6', brand: 'Google', price: 599 },
            { _id: 4, name: 'OnePlus 9', category: 'OnePlus', price: 729 },
            { _id: 5, name: 'Xperia 5', category: 'Sony', price: 849 }
        ];

        const result = await database.collection('produse').insertMany(products);

        res.send('<script>alert("Produsele au fost inserate cu succes!"); window.location.href = "/";</script>');
    } catch (e) {
        res.send('<script>alert("Eroare la inserarea produselor în baza de date!"); window.location.href = "/";</script>');
    } finally {
        await client.close();
    }
});

app.post('/admin/adaugare-produs', async (req, res) => {
    if (!req.session.utilizator || req.session.utilizator.rol === 'USER') {
        return res.status(403).send('<h3>Acces interzis!</h3>');
    }

    const { name, brand, price } = req.body;

    if (!name || !brand || isNaN(price)) {
        return res.status(400).send('<h1>Date de intrare invalide!</h1>');
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('cumparaturi');

        const numarProduse = await database.collection('produse').countDocuments();

        const newProduct = { _id: numarProduse + 1, name, brand, price: parseFloat(price) };

        await database.collection('produse').insertOne(newProduct);

        res.send('<script>alert("Produsul a fost adăugat cu succes!"); window.location.href = "/admin";</script>');
    } catch (e) {
        console.error(e);
        res.send('<script>alert("Eroare la adăugarea produsului în baza de date!"); window.location.href = "/admin";</script>');
    } finally {
        await client.close();
    }
});

app.use((req, res, next) => {
    res.status(404).send('<h1>404 - Resursa nu a fost găsită</h1>');
});

app.listen(port, () => console.log(`Serverul rulează la http://localhost:${port}`));
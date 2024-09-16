class ShoppingCartStorageBase {
    constructor() {}

    addProduct(product) {
        return Promise.reject(new Error("Method 'addProduct' must be implemented in subclasses"));
    }

    getProducts() {
        return Promise.reject(new Error("Method 'getProducts' must be implemented in subclasses"));
    }

    resetDatabase() {
        return Promise.reject(new Error("Method 'resetDatabase' must be implemented in subclasses"));
    }
}

class ShoppingCartLocalStorage extends ShoppingCartStorageBase {
    constructor() {
        super();
        if (!localStorage.getItem('shoppingCart')) {
            localStorage.setItem('shoppingCart', JSON.stringify([]));
        }
    }

    addProduct(product) {
        return new Promise((resolve, reject) => {
            let shoppingCart = this.getShoppingCart();
            shoppingCart.push(product);
            this.saveShoppingCart(shoppingCart);
            resolve();
        });
    }

    getProducts() {
        return Promise.resolve(this.getShoppingCart());
    }

    resetDatabase() {
        localStorage.removeItem('shoppingCart');
        return Promise.resolve();
    }

    getShoppingCart() {
        return JSON.parse(localStorage.getItem('shoppingCart')) || [];
    }

    saveShoppingCart(cart) {
        localStorage.setItem('shoppingCart', JSON.stringify(cart));
    }
}

class ShoppingCartIndexedDB extends ShoppingCartStorageBase {
    constructor() {
        super();
        this.dbName = 'ShoppingCartDB';
        this.dbVersion = 1;
        this.dbStoreName = 'products';
        this.db = null;
        this.initDB();
    }

    initDB() {
        let request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = function(event) {
            console.error("Error opening database:", event.target.errorCode);
            reject(event.target.errorCode);
        };

        request.onsuccess = function(event) {
            console.log("Database opened successfully");
            this.db = event.target.result;
        }.bind(this);

        request.onupgradeneeded = function(event) {
            let db = event.target.result;
            if (!db.objectStoreNames.contains(this.dbStoreName)) {
                db.createObjectStore(this.dbStoreName, { keyPath: 'id', autoIncrement: true });
            }
        }.bind(this);
    }

    addProduct(product) {
        return new Promise((resolve, reject) => {
            let transaction = this.db.transaction([this.dbStoreName], 'readwrite');
            let objectStore = transaction.objectStore(this.dbStoreName);
            let request = objectStore.add(product);

            request.onerror = function(event) {
                console.error("Error adding product:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = function(event) {
                console.log("Product added successfully to IndexedDB");
                resolve();
            };
        });
    }

    getProducts() {
        return new Promise((resolve, reject) => {
            let transaction = this.db.transaction([this.dbStoreName], 'readonly');
            let objectStore = transaction.objectStore(this.dbStoreName);
            let request = objectStore.getAll();

        
            request.onerror = function(event) {
                console.error("Error getting products:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = function(event) {
                const result = event.target.result;
                if (result) {
                    resolve(result);
                } else {
                    console.error("No products found in the database.");
                    resolve([]);
                }
            };
        });
    }

    resetDatabase() {
        return new Promise((resolve, reject) => {
            var request = indexedDB.deleteDatabase(this.dbName);

            request.onerror = function(event) {
                console.error("Error deleting database:", event.target.errorCode);
                reject(event.target.errorCode);
            }; 

            request.onblocked = function () {
                console.log("Couldn't delete database due to the operation being blocked");
                reject("Operation blocked");
            };

            request.onsuccess = function(event) {
                console.log("Database deleted successfully");
                resolve();
            };
        });
    }
}

var localStorageInstance = new ShoppingCartLocalStorage();
var indexedDBInstance = new ShoppingCartIndexedDB();

function Product(productId, productName, productAmount) {
    this.id = productId;
    this.name = productName;
    this.amount = productAmount;
}

var worker = new Worker('js/worker.js');

function addProduct() {
    var newProductName = document.getElementById('productName').value;
    var newProductAmount = document.getElementById('productAmount').value;

    if (!newProductName || isNaN(newProductAmount)) {
        alert('Please fill in the product name and quantity correctly.');
        return;
    }

    var selectedMethod = document.getElementById('storageMethod').value;

    var shoppingCartStorage;

    if (selectedMethod === 'localStorage') {
        shoppingCartStorage = localStorageInstance;
        
    } else if (selectedMethod === 'indexedDB') {
        shoppingCartStorage = indexedDBInstance;
    }

    shoppingCartStorage.getProducts().then(products => {
        var newProductId = products.length ? products.length + 1 : 1;
        var newProduct = new Product(newProductId, newProductName, newProductAmount);
    
        shoppingCartStorage.addProduct(newProduct).then(() => {
            addNewRow(newProduct);
            worker.postMessage('Add button was clicked');
        }).catch(error => {
            console.error("Error adding product:", error);
        });
    }).catch(error => {
        console.error("Error getting products:", error);
    });
}

function addNewRow(product) {
    var tableBody = document.getElementById('shoppingCartBody');
    var newRow = document.createElement('tr');
    newRow.innerHTML =  '<td>' + product.id + '</td><td>' + product.name + '</td><td>' + product.amount + '</td>';
    tableBody.appendChild(newRow);
}

worker.addEventListener('message', function(e) {
    console.log('Mesaj de la Web Worker:', e.data);
});

function changeStorageMethod() {
    var selectElement = document.getElementById('storageMethod').value;
    refreshShoppingCartTable(selectElement); 
}

function refreshShoppingCartTable(storageMethod) {
    var shoppingCartStorage;
    
    if (storageMethod === 'localStorage') {
        shoppingCartStorage = localStorageInstance;
    } else if (storageMethod === 'indexedDB') {
        shoppingCartStorage = indexedDBInstance;
    } 

    shoppingCartStorage.getProducts().then(products => {
        var tableBody = document.getElementById('shoppingCartBody');
        tableBody.innerHTML = '';

        if (products.length === 0) {
            return;
        } else {
            products.forEach(function(product) {
                addNewRow(product);
            });
        }
    }).catch(error => {
        console.error("Error getting products:", error);
    });
}

function loadShoppingCartFirst() {
    var shoppingCartStorage = localStorageInstance;

    shoppingCartStorage.getProducts().then(products => {
        var tableBody = document.getElementById('shoppingCartBody');
        tableBody.innerHTML = '';

        if (products.length === 0) {
            return;
        } else {
            products.forEach(function(product) {
                addNewRow(product);
            });
        }
    }).catch(error => {
        console.error("Error getting products:", error);
    });
}

function resetDatabase() {
    var selectElement = document.getElementById('storageMethod');
    var selectedMethod = selectElement.value;

    var shoppingCartStorage;
    if (selectedMethod === 'localStorage') {
        shoppingCartStorage = localStorageInstance;
    } else if (selectedMethod === 'indexedDB') {
        shoppingCartStorage = indexedDBInstance;
    }

    shoppingCartStorage.resetDatabase().then(() => {
        refreshShoppingCartTable(selectedMethod);
    }).catch(error => {
        console.error("Error resetting database:", error);
    });
}

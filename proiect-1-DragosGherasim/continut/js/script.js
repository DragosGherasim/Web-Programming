function loadLearnPage()
{
    setInterval(displayDate, 1000);
    getClientDetails();
    setupCanvasDrawing();
    listenDynamicTableSection()
}

function displayDate()
{
    const d = new Date();

    document.getElementById("date-p").innerHTML = "Data şi timpul curent : " + d.toLocaleString() + '<br>';
}

async function getClientDetails()
{
    let url = window.location.origin;
    document.getElementById("details-p").innerHTML = "Url : " + url + '<br>';

    if (navigator.geolocation) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            let latitude = position.coords.latitude;
            let longitude = position.coords.longitude;
            document.getElementById("details-p").innerHTML += "Locaţia : Latitudine " + latitude + ", Longitudine " + longitude + '<br>';
        } catch (error) {
            document.getElementById("details-p").innerHTML += "Locaţia : Locația nu este disponibilă.<br>";
        }
    } else {
        document.getElementById("details-p").innerHTML += "Locaţia : Locația nu este disponibilă.<br>";
    }

    let agent = navigator.userAgent;
    document.getElementById("details-p").innerHTML += "Detaliile tehnice ale user-ului : " + agent + '<br>';
}

function setupCanvasDrawing() {
    let canvas = document.getElementById("customizeCanvas");
    let context = canvas.getContext("2d");
    let isDrawing = false;
    let startX, startY, endX, endY;

    canvas.addEventListener("mousedown", startDrawing);

    function startDrawing(event) {
        if (!isDrawing) {
            startX = event.clientX - canvas.getBoundingClientRect().left;
            startY = event.clientY - canvas.getBoundingClientRect().top;
            isDrawing = true;
        } else {
            endX = event.clientX - canvas.getBoundingClientRect().left;
            endY = event.clientY - canvas.getBoundingClientRect().top;
            drawRectangle(startX, startY, endX, endY);
            isDrawing = false;
        }
    }
    
    function drawRectangle(startX, startY, endX, endY) {
        let width = Math.abs(endX - startX);
        let height = Math.abs(endY - startY);
        let x = Math.min(startX, endX);
        let y = Math.min(startY, endY);
        
        context.beginPath();
        context.strokeStyle = document.getElementById("borderColor").value; 
        context.fillStyle = document.getElementById("bkgColor").value; 
        context.lineWidth = 5;
        context.rect(x, y, width, height);
        context.stroke();
        context.fill();
        context.closePath();
    }
}

function resetCanvas() {
    var canvas = document.getElementById("customizeCanvas");
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function listenDynamicTableSection()
{
    document.getElementById("rowInsertBtn").addEventListener("click", insertRow);
    document.getElementById("colInsertBtn").addEventListener("click", insertColumn);
}

function insertRow(event) {
    event.preventDefault(); 
    let position = parseInt(document.getElementById("colRowPosition").value);
    let color = document.getElementById("colRowColor").value;

    let table = document.getElementById("dynamicTable");
    let rowCount = table.rows.length;

    if (position < 1 || position > rowCount) {
        alert("Poziția trebuie să fie între 1 și " + rowCount);
        return;
    }

    let newRow = table.insertRow(position);

    for (let i = 0; i < table.rows[0].cells.length; i++) {
        let cell = newRow.insertCell(i);
        cell.style.backgroundColor = color;
        cell.textContent = "";
    }
}

function insertColumn(event) {
    event.preventDefault(); 
    let position = parseInt(document.getElementById("colRowPosition").value);
    let color = document.getElementById("colRowColor").value;

    let table = document.getElementById("dynamicTable");
    let columnCount = table.rows[0].cells.length;

    if (position < 1 || position > columnCount) {
        alert("Poziția trebuie să fie între 1 și " + columnCount);
        return;
    }

    for (let i = 0; i < table.rows.length; i++) {
        let cell = table.rows[i].insertCell(position);
        cell.style.backgroundColor = color;
        cell.textContent = "";
    }
}

function contentChange(resource, jsFiles, jsFunction) { 
    var xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            document.getElementById("continut").innerHTML = this.responseText;

            var links = document.querySelectorAll(".nav-links a");
            links.forEach(function(link) {
                if (link.getAttribute("onclick").includes(resource)) {
                    link.classList.add("active");
                } else {
                    link.classList.remove("active");
                }
            });

            if (jsFiles && Array.isArray(jsFiles)) {
                jsFiles.forEach(function(jsFile) {
                    var elementScript = document.createElement('script');
                    elementScript.onload = function () {
                        if (jsFunction && typeof window[jsFunction] === 'function') {
                            window[jsFunction]();
                        }
                    };
                    elementScript.src = jsFile;
                    document.head.appendChild(elementScript);
                });
            } else {
                if (jsFunction) {
                    window[jsFunction]();
                }
            } 
        }
    };

    xhttp.open("GET", resource + ".html", true);
    xhttp.send();
}

function validateUser() {
    var userInput = document.getElementById("username").value;
    var passwordInput = document.getElementById("password").value;

    if(!userInput || !passwordInput) {
        alert("Vă rugăm să completați toate câmpurile necesare.");
        return; 
    }

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var users = JSON.parse(this.responseText);

            var found = false;
            for (var i = 0; i < users.length; i++) {
                if (users[i].utilizator === userInput && users[i].parola === passwordInput) {
                    found = true;
                    break;
                }
            }

            if (found) {
                document.getElementById("validate-status-p").innerText = "Utilizatorul și parola sunt corecte!";
            } else {
                document.getElementById("validate-status-p").innerText = "Utilizatorul sau parola sunt incorecte!";
            }
        }
    };
    xhttp.open("GET", "resurse/utilizatori.json", true);
    xhttp.send();
}

function registrationUser(){
    var userInput = document.getElementById("username").value;
    var passwordInput = document.getElementById("password").value;

    var userData = {
        "utilizator": userInput,
        "parola": passwordInput
    };

    if(!userInput || !passwordInput) {
        alert("Vă rugăm să completați toate câmpurile necesare.");
        return; 
    }

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 201) {
            alert(this.responseText);
        }
    };

    xhttp.open("POST", "api/utilizatori.json", true);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send(JSON.stringify(userData));
}
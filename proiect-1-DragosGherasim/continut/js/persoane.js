function loadPersons(){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            displayPersons(this);
        }
    };

  xhttp.open("GET", "resurse/persoane.xml", true);
  xhttp.send();
}

function displayPersons(xml) {
    var xmlDoc = xml.responseXML;
    var persons = xmlDoc.getElementsByTagName("persoana");
    var table = "<table><thead><tr><th>Nume</th><th>Prenume</th><th>Vârstă</th><th>Adresă</th><th>CNP</th><th>Naționalitate</th><th>Joburi</th></tr></thead><tbody>";

    for (var i = 0; i < persons.length; i++) {
        var nume = persons[i].getElementsByTagName("nume")[0].textContent;
        var prenume = persons[i].getElementsByTagName("prenume")[0].textContent;
        var varsta = persons[i].getElementsByTagName("varsta")[0].textContent;
        var adresaNodes = persons[i].getElementsByTagName("adresa")[0].children;

        var adresa = "";
        for (var j = 0; j < adresaNodes.length; j++) {
            adresa += adresaNodes[j].textContent;
            if (j < adresaNodes.length - 1) {
                adresa += ", ";
            }
        }

        var cnp = persons[i].getElementsByTagName("CNP")[0].textContent;
        var nationalitate = persons[i].getElementsByTagName("nationalitate")[0].textContent;
        var jobsNode = persons[i].getElementsByTagName("jobs")[0];
        var jobs = "";

        for (var j = 0; j < jobsNode.children.length; j++) {
            jobs += jobsNode.children[j].textContent + "<br>";
        }

        table += "<tr><td>" + nume + "</td><td>" + prenume + "</td><td>" + varsta + "</td><td>" + adresa + 
                    "</td><td>" + cnp + "</td><td>" + nationalitate + "</td><td>" + jobs + "</td></tr>";
    }

    table += "</tbody></table>";

    document.getElementById("display-persons-p").innerHTML = "Persoanele fidele de pe site-ul nostru: ";

    document.querySelector(".display-persons").innerHTML += table;
}
import socket
import gzip
import threading
import json

tipuriMedia = {
    'html': 'text/html; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'js': 'text/javascript; charset=utf-8',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif', 
    'ico': 'image/x-icon',
    'xml': 'application/xml; charset=utf-8',
    'json': 'application/json; charset=utf-8'
}

def handle_get_request(clientsocket, cale):
    numeResursa = f"../continut{cale}"
    tipMedia = tipuriMedia.get(cale[cale.rfind('.')+1:], 'text/plain; charset=utf-8')

    try:
        with open(numeResursa, 'rb') as fisier:
            content = fisier.read()
            compressedContent = gzip.compress(content)

            clientsocket.sendall(b'HTTP/1.1 200 OK\r\n')
            clientsocket.sendall(('Content-Length: ' + str(len(compressedContent)) + '\r\n').encode())
            clientsocket.sendall(('Content-Type: ' + tipMedia +'\r\n').encode())
            clientsocket.sendall(b'Content-Encoding: gzip\r\n')
            clientsocket.sendall(b'Server: My PW Server\r\n')
            clientsocket.sendall(b'\r\n')
            clientsocket.sendall(compressedContent)

    except IOError:
        msg = f'Eroare! Resursa ceruta {cale[1:]} nu a putut fi gasita!'.encode('utf-8')
        compressedMsg = gzip.compress(msg)

        clientsocket.sendall(b'HTTP/1.1 404 Not Found\r\n')
        clientsocket.sendall(('Content-Length: ' + str(len(compressedMsg)) + '\r\n').encode())
        clientsocket.sendall(b'Content-Type: text/plain; charset=utf-8\r\n')
        clientsocket.sendall(b'Content-Encoding: gzip\r\n')
        clientsocket.sendall(b'Server: My PW Server\r\n')
        clientsocket.sendall(b'\r\n')
        clientsocket.sendall(compressedMsg)
    finally:
        if fisier is not None:
            fisier.close()

def handle_post_request(clientsocket, cale, data):
    try:
        with open(f'../continut/resurse/{cale.split('/')[-1]}', 'r+') as fisier:
            users = json.load(fisier)
            users.append(json.loads(data))
            fisier.seek(0)
            json.dump(users, fisier)
            fisier.truncate()

        msg = 'Utilizatorul a fost înregistrat cu succes!'.encode()
        compressedMsg = gzip.compress(msg)
        clientsocket.sendall(b'HTTP/1.1 201 Created\r\n')
        clientsocket.sendall(('Content-Length: ' + str(len(compressedMsg)) + '\r\n').encode())
        clientsocket.sendall(b'Content-Type: text/plain; charset=utf-8\r\n')
        clientsocket.sendall(b'Content-Encoding: gzip\r\n')
        clientsocket.sendall(b'Server: My PW Server\r\n')
        clientsocket.sendall(b'\r\n')
        clientsocket.sendall(compressedMsg)
    except IOError:
        msg = 'Eroare la deschiderea fișierului utilizatori.json.'.encode()
        compressedMsg = gzip.compress(msg)

        clientsocket.sendall(b'HTTP/1.1 404 Not Found\r\n')
        clientsocket.sendall(('Content-Length: ' + str(len(compressedMsg)) + '\r\n').encode())
        clientsocket.sendall(b'Content-Type: text/plain; charset=utf-8\r\n')
        clientsocket.sendall(b'Content-Encoding: gzip\r\n')
        clientsocket.sendall(b'Server: My PW Server\r\n')
        clientsocket.sendall(b'\r\n')
        clientsocket.sendall(compressedMsg)
    finally:
        if fisier is not None:
            fisier.close()
    

def handle_client(clientsocket):
    cerere = ''
    linieDeStart = ''

    while True:
        data = clientsocket.recv(1024)
        cerere = cerere + data.decode()
        print('S-a citit mesajul: \n---------------------------\n' + cerere + '\n---------------------------')

        pozitie = cerere.find('\r\n')
        if (pozitie > -1):
            linieDeStart = cerere[0:pozitie]
            print('S-a citit linia de start din cerere: #####' + linieDeStart + '#####')
            break

    print('S-a terminat cititrea.')
    if linieDeStart == '':
        clientsocket.close()
        print('S-a terminat comunicarea cu clientul - nu s-a primit niciun mesaj.')
        return

    _, cale, _ = linieDeStart.split(' ')

    if cale == '/api/utilizatori.json':
        if linieDeStart.startswith('POST'):
            handle_post_request(clientsocket, cale, cerere.split('\r\n\r\n')[1])
        else:
            msg = 'Cerere nepermisa pentru resursa API.'.encode()
            compressedMsg = gzip.compress(msg)

            clientsocket.sendall(b'HTTP/1.1 404 Not Found\r\n')
            clientsocket.sendall(('Content-Length: ' + str(len(compressedMsg)) + '\r\n').encode())
            clientsocket.sendall(b'Content-Type: text/plain; charset=utf-8\r\n')
            clientsocket.sendall(b'Content-Encoding: gzip\r\n')
            clientsocket.sendall(b'Server: My PW Server\r\n')
            clientsocket.sendall(b'\r\n')
            clientsocket.sendall(compressedMsg)
    else:
        handle_get_request(clientsocket, cale)
    
    clientsocket.close()
    print('S-a terminat comunicarea cu clientul.')

if __name__ == '__main__':
    serversocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    serversocket.bind(('', 5678))
    serversocket.listen(5) 

    while True:
        print('#########################################################################')
        print('Serverul asculta potentiali clienti.')
        clientsocket, _ = serversocket.accept()
        print('S-a conectat un client.')

        threading.Thread(target=handle_client, args=(clientsocket,)).start()

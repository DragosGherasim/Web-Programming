self.addEventListener('message', function(e) {
    console.log('Mesaj primit de la scriptul principal:', e.data);

    self.postMessage('Mesaj primit și procesat de către worker');
});
document.addEventListener('DOMContentLoaded', function() {
    const commandInput = document.getElementById('commandInput');
    const commandOutput = document.getElementById('commandOutput');
  
    commandInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); 
        const query = e.target.value;
        e.target.value = '';
  
        const formData = new FormData();
        formData.append('query', query);
  
        fetch('/ll', {
          method: 'POST',
          body: formData,
        })
          .then((response) => response.text())
          .then((content) => {
            commandOutput.innerHTML = content;
          })
          .catch((error) => {
            console.error('Fetch error:', error);
            commandOutput.textContent = 'Fetch error: Unable to connect.';
          });
      }
    });
  });
  